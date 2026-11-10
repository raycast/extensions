import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { useState } from "react";
import {
  Action,
  ActionPanel,
  closeMainWindow,
  Color,
  Form,
  Icon,
  List,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";

import { getAppleScriptErrorMessage } from "./utils/errors";
import { runAppleScript } from "./utils/applescript";
import { appleScriptString, toTildePath } from "./utils/paths";

const execFileAsync = promisify(execFile);

type SurfaceInfo = {
  windowIndex: number;
  tabIndex: number;
  paneIndex: number;
  terminalId: string;
  pid: number;
  tty: string;
  cwd: string;
  isFocused: boolean;
  tabName: string;
  name: string;
  process?: string;
};

type ProcessInfo = { dead: boolean; comm: string };

// One record per surface (split pane), fields separated by ASCII 31 so that
// titles and working directories can safely contain any other character.
const FIELD_SEP = "\u001f";
const fetchSurfacesScript = `
tell application "Ghostty"
  if (count of windows) is 0 then
    return "Error: Ghostty has no windows"
  end if
  set fieldSep to character id 31
  set output to ""
  repeat with w from 1 to count of windows
    set winRef to window w
    repeat with t from 1 to count of tabs of winRef
      set tabRef to tab t of winRef
      set tabName to name of tabRef
      if tabName is missing value or tabName is "" then
        set tabName to "Tab " & t
      end if
      set focusedRef to missing value
      try
        set focusedRef to focused terminal of tabRef
      end try
      set paneIndex to 0
      repeat with s in terminals of tabRef
        set paneIndex to paneIndex + 1
        set surfaceName to name of s
        if surfaceName is missing value or surfaceName is "" then
          set surfaceName to tabName
        end if
        set surfaceCwd to working directory of s
        if surfaceCwd is missing value then
          set surfaceCwd to ""
        end if
        set surfaceTty to tty of s
        if surfaceTty is missing value then
          set surfaceTty to ""
        end if
        set surfacePid to 0
        try
          set surfacePid to pid of s
        end try
        set focusedFlag to "0"
        try
          if (id of focusedRef) is (id of s) then
            set focusedFlag to "1"
          end if
        end try
        if length of output is greater than 0 then
          set output to output & fieldSep
        end if
        set output to output & w & fieldSep & t & fieldSep & paneIndex & fieldSep & (id of s) & fieldSep & surfacePid & fieldSep & surfaceTty & fieldSep & surfaceCwd & fieldSep & focusedFlag & fieldSep & tabName & fieldSep & surfaceName
      end repeat
    end repeat
  end repeat
  return output
end tell
`;

// Address the surface by its stable id instead of window/tab indexes so a
// re-render between listing and focusing can't target the wrong surface.
// Raises an AppleScript error when the surface no longer exists, so callers
// reach their failure handlers instead of reporting success.
const findSurfaceScript = (
  terminalId: string,
  body: (surfaceVar: string, tabVar: string, windowVar: string) => string,
) => `
tell application "Ghostty"
  repeat with w in windows
    repeat with t in tabs of w
      repeat with s in terminals of t
        if (id of s) is ${appleScriptString(terminalId)} then
          ${body("s", "t", "w")}
          exit repeat
        end if
      end repeat
    end repeat
  end repeat
  error "Ghostty surface not found"
end tell
`;

const focusSurfaceScript = (terminalId: string) =>
  findSurfaceScript(
    terminalId,
    (s, t, w) => `
    activate
    activate window ${w}
    select tab ${t}
    focus ${s}
    return "ok"`,
  );

const setSurfaceNameOverrideScript = (terminalId: string, alias: string) =>
  findSurfaceScript(
    terminalId,
    (s) => `
    set name override of ${s} to ${appleScriptString(alias)}
    return "ok"`,
  );

type ProcessLookup = Map<number, ProcessInfo> | null;

// Resolve surface pids to foreground process names and liveness. Returns null
// when ps is unavailable, in which case every surface is kept as-is.
async function lookupProcesses(pids: number[]): Promise<ProcessLookup> {
  const uniquePids = [...new Set(pids.filter((pid) => pid > 0))];
  const lookup = new Map<number, ProcessInfo>();
  if (uniquePids.length === 0) {
    return lookup;
  }
  try {
    const { stdout } = await execFileAsync("ps", ["-o", "pid=,stat=,comm=", "-p", uniquePids.join(",")]);
    for (const line of stdout.split("\n")) {
      const match = line.trim().match(/^(\d+)\s+(\S+)\s+(.*)$/);
      if (match) {
        lookup.set(parseInt(match[1], 10), { dead: match[2].includes("Z"), comm: match[3].trim() });
      }
    }
  } catch {
    return null;
  }
  return lookup;
}

const processName = (comm: string) => comm.replace(/^-/, "").split("/").pop() ?? "";

// Ghostty's scripting dictionary keeps reporting surfaces whose shell already
// exited (with pid 0, or a pid that is reaped / zombie in ps); drop them here.
async function markLiveSurfaces(surfaces: SurfaceInfo[]): Promise<SurfaceInfo[]> {
  const processes = await lookupProcesses(surfaces.map((surface) => surface.pid));
  if (processes === null) {
    return surfaces;
  }
  return surfaces
    .filter((surface) => {
      if (surface.pid <= 0) {
        return false;
      }
      const info = processes.get(surface.pid);
      return info !== undefined && !info.dead;
    })
    .map((surface) => {
      const info = processes.get(surface.pid);
      const proc = processName(info?.comm ?? "");
      return { ...surface, process: proc || undefined };
    });
}

async function fetchSurfaces(): Promise<SurfaceInfo[]> {
  try {
    const result = await runAppleScript(fetchSurfacesScript);
    if (result.startsWith("Error:")) {
      return [];
    }
    // Records and fields share the same separator; every record is 10 fields.
    const fields = result.split(FIELD_SEP);
    const surfaces: SurfaceInfo[] = [];
    for (let i = 0; i + 10 <= fields.length; i += 10) {
      const parts = fields.slice(i, i + 10);
      if (parts[0] === "") {
        continue;
      }
      surfaces.push({
        windowIndex: parseInt(parts[0], 10),
        tabIndex: parseInt(parts[1], 10),
        paneIndex: parseInt(parts[2], 10),
        terminalId: parts[3] ?? "",
        pid: parseInt(parts[4], 10) || 0,
        tty: parts[5] ?? "",
        cwd: parts[6] ?? "",
        isFocused: parts[7] === "1",
        tabName: parts[8] ?? "",
        name: (parts[9] ?? "").trim() || "Untitled",
      });
    }
    return await markLiveSurfaces(surfaces);
  } catch (error) {
    await showFailureToast(error, {
      title: "Error",
      message: getAppleScriptErrorMessage(error),
    });
    return [];
  }
}

async function focusSurface(surface: SurfaceInfo) {
  try {
    await runAppleScript(focusSurfaceScript(surface.terminalId));
  } catch (error) {
    await showFailureToast(error, {
      title: "Error",
      message: "Error focusing the surface.",
    });
  }
}

function RenameSurfaceForm({ surface, onRenamed }: { surface: SurfaceInfo; onRenamed: () => void }) {
  async function rename(values: { alias: string }) {
    const alias = values.alias.trim();
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Renaming surface…",
    });
    try {
      await runAppleScript(setSurfaceNameOverrideScript(surface.terminalId, alias));
      toast.style = Toast.Style.Success;
      toast.title = alias ? `Alias set to '${alias}'` : "Alias cleared";
      onRenamed();
      await popToRoot();
    } catch (error) {
      await showFailureToast(error, {
        title: "Rename failed",
        message: getAppleScriptErrorMessage(error),
      });
    }
  }

  return (
    <Form
      navigationTitle={`Rename ${surface.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Alias" icon={Icon.Checkmark} onSubmit={rename} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="alias"
        title="Alias"
        defaultValue={surface.name}
        placeholder="Leave empty to restore the original title"
        info="Stored as Ghostty's name override (session-scoped). An empty value clears it."
      />
    </Form>
  );
}

export default function SearchGhosttyTabs() {
  const [searchText, setSearchText] = useState("");
  const { data: surfaces, isLoading, revalidate } = usePromise(fetchSurfaces);

  return (
    <List
      isLoading={isLoading}
      filtering={true}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Ghostty Tabs"
      searchBarPlaceholder="Search tabs and surfaces..."
    >
      {(surfaces?.length ?? 0) === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Terminal}
          title="No tabs found"
          description="Open Ghostty and create some tabs, or ensure AppleScript is enabled (macos-applescript = true)."
        />
      ) : null}
      {surfaces?.map((surface) => (
        <List.Item
          key={surface.terminalId}
          title={surface.name}
          subtitle={[
            `W${surface.windowIndex}`,
            `T${surface.tabIndex}`,
            `pane${surface.paneIndex}`,
            toTildePath(surface.cwd),
            surface.process,
          ]
            .filter(Boolean)
            .join(" · ")}
          keywords={[surface.tabName, surface.cwd, surface.tty, surface.process ?? ""].filter(Boolean)}
          icon={Icon.Terminal}
          accessories={[
            surface.tty ? { text: surface.tty.replace("/dev/", "") } : undefined,
            surface.isFocused ? { tag: { value: "Focused", color: Color.Green } } : undefined,
          ].filter((accessory) => accessory !== undefined)}
          actions={
            <ActionPanel>
              <Action
                title="Focus Surface"
                icon={Icon.ArrowRight}
                onAction={async () => {
                  await focusSurface(surface);
                  await popToRoot();
                  await closeMainWindow();
                }}
              />
              <Action.Push
                title="Rename…"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                target={<RenameSurfaceForm surface={surface} onRenamed={revalidate} />}
              />
              <Action.CopyToClipboard
                title="Copy Working Directory"
                content={surface.cwd}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
