import { useEffect, useState } from "react";
import fs from "node:fs";
import os from "node:os";
import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  Image,
  Keyboard,
  List,
  Toast,
  environment,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import {
  Diagnostics,
  LinkTest,
  ToolCheck,
  diagnosticsReport,
  summary,
  toolVerdict,
  withoutHome,
} from "../lib/doctor.js";
import { errorSummary } from "../lib/run.js";
import { getToolVersion } from "../lib/tool-freshness.js";
import { getInstalledVersion } from "../lib/managed-binary.js";
import { TOOL_INFO, ToolId, toolInfoFor } from "../lib/tools.js";
import { displayVersion } from "../lib/tool-status.js";
import { fetchVideoInfo } from "../lib/ytdlp.js";
import { saveModeLabel } from "../lib/filetype.js";
import {
  downloadPath,
  getDenoPath,
  getGalleryDlPath,
  getIdleTimeoutMs,
  getMonolithPath,
  getSpotdlPath,
  getffmpegPath,
  getffprobePath,
  getytdlPath,
} from "../utils.js";
import Updater from "./updater.js";

/** A short, old, public video: reading its details shows whether yt-dlp, Deno and the network work together. */
const TEST_LINK = "https://www.youtube.com/watch?v=jNQXAC9IVRw";

/** Where bug reports for Store extensions go, with this extension filled in. */
const ISSUE_URL =
  "https://github.com/raycast/extensions/issues/new?template=extension_bug_report.yml&extension-url=https%3A%2F%2Fwww.raycast.com%2FStheno%2Fthe-downloader&title=%5BThe+Downloader%5D+";

type Row = { id: string; tool: ToolId; path: () => string; preference?: string };

function rows(): Row[] {
  const prefs = getPreferenceValues<ExtensionPreferences>();
  return [
    { id: "yt-dlp", tool: "yt-dlp", path: getytdlPath, preference: prefs.ytdlPath },
    { id: "ffmpeg", tool: "ffmpeg", path: getffmpegPath, preference: prefs.ffmpegPath },
    { id: "ffprobe", tool: "ffmpeg", path: getffprobePath, preference: prefs.ffprobePath },
    { id: "deno", tool: "deno", path: getDenoPath, preference: prefs.denoPath },
    { id: "gallery-dl", tool: "gallery-dl", path: getGalleryDlPath, preference: prefs.galleryDlPath },
    { id: "spotdl", tool: "spotdl", path: getSpotdlPath, preference: prefs.spotDlPath },
    { id: "monolith", tool: "monolith", path: getMonolithPath, preference: prefs.monolithPath },
  ];
}

/** Where a tool is and whether it's there: known at once. Its version is asked for afterwards. */
function locateTool(row: Row): ToolCheck {
  const path = row.path();
  const found = fs.existsSync(path);
  return {
    id: row.id,
    purpose: row.id === "ffprobe" ? "Reads a file's streams for ffmpeg and yt-dlp" : TOOL_INFO[row.tool].purpose,
    path,
    found,
    fromPreference: !!row.preference?.trim() && fs.existsSync(row.preference.trim()),
    checking: found,
  };
}

/** The version a found tool reports; undefined when it won't run. */
async function versionOf(row: Row, path: string): Promise<string | undefined> {
  // spotDL's bundled program unpacks itself on its first run and needs far longer than the others.
  if (row.id === "spotdl") return getInstalledVersion(path).catch(() => undefined);
  return getToolVersion(path, row.tool);
}

function isWritable(folder: string): boolean {
  try {
    fs.accessSync(folder, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function systemName(): string {
  const name = process.platform === "darwin" ? "macOS" : process.platform === "win32" ? "Windows" : process.platform;
  return `${name} ${os.release()} (${os.arch()})`;
}

/** Settings that change how downloads run. Secrets (Spotify's keys) are named only as set or not. */
function settings(): Diagnostics["settings"] {
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const onOff = (value: unknown) => (value ? "on" : "off");
  return [
    { label: "Cookies from Browser", value: prefs.cookiesFromBrowser || "none" },
    { label: "Video: Browser Cookies", value: onOff(prefs.videoCookies) },
    { label: "Video: Metadata", value: onOff(prefs.videoEmbedMetadata) },
    { label: "Video: SponsorBlock", value: onOff(prefs.videoSponsorBlock) },
    { label: "Webpage: Save Mode", value: saveModeLabel(prefs.webpageSaveMode) },
    { label: "Force IPv4", value: onOff(prefs.forceIpv4) },
    { label: "Network Idle Timeout", value: `${Math.round(getIdleTimeoutMs() / 1000)}s` },
    { label: "Check for Tool Updates", value: onOff(prefs.checkToolUpdates) },
    { label: "Spotify keys", value: prefs.spotifyClientId && prefs.spotifyClientSecret ? "set" : "not set" },
  ];
}

const STATE_COLOR = {
  ok: Color.Green,
  old: Color.Yellow,
  broken: Color.Red,
  missing: Color.SecondaryText,
  checking: Color.Blue,
} as const;
const STATE_ICON = {
  ok: Icon.CheckCircle,
  old: Icon.ArrowUpCircle,
  broken: Icon.XMarkCircle,
  missing: Icon.Circle,
  checking: Icon.CircleProgress,
} as const;

/**
 * Check Tools: every command-line tool The Downloader uses, where it was
 * found and which version runs, plus a report to paste into a bug report.
 */
export function Doctor() {
  const [tools, setTools] = useState<ToolCheck[]>();
  const [linkTest, setLinkTest] = useState<LinkTest>();
  const [testing, setTesting] = useState(false);
  const [run, setRun] = useState(0);

  useEffect(() => {
    let active = true;
    const all = rows();
    const located = all.map(locateTool);
    setTools(located);
    // Each version arrives on its own, so one slow tool doesn't hold up the list.
    for (const [index, row] of all.entries()) {
      if (!located[index].found) continue;
      void versionOf(row, located[index].path)
        .catch(() => undefined)
        .then((version) => {
          if (!active) return;
          setTools((current) =>
            current?.map((tool) => (tool.id === row.id ? { ...tool, version, checking: false } : tool)),
          );
        });
    }
    return () => {
      active = false;
    };
  }, [run]);

  const now = Date.now();
  const home = os.homedir();
  const folder = { path: downloadPath, writable: isWritable(downloadPath) };
  const diagnostics: Diagnostics = {
    system: systemName(),
    raycast: environment.raycastVersion,
    node: process.version,
    tools: tools ?? [],
    folder,
    settings: settings(),
    linkTest,
  };

  async function testLink() {
    if (testing) return;
    const ytdlPath = getytdlPath();
    if (!fs.existsSync(ytdlPath)) {
      await showToast({ style: Toast.Style.Failure, title: "yt-dlp Is Not Installed" });
      return;
    }
    setTesting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Reading a Test Link",
      message: "youtube.com",
    });
    const startedAt = Date.now();
    const denoPath = getDenoPath();
    const prefs = getPreferenceValues<ExtensionPreferences>();
    let result: LinkTest;
    try {
      const video = await fetchVideoInfo(
        ytdlPath,
        TEST_LINK,
        !!prefs.forceIpv4,
        fs.existsSync(denoPath) ? denoPath : undefined,
        { timeoutMs: getIdleTimeoutMs() },
      );
      result = { ok: true, detail: `“${video.title}”, ${video.formats?.length ?? 0} formats`, seconds: 0 };
    } catch (error) {
      result = {
        ok: false,
        detail: errorSummary(error instanceof Error ? error.message : String(error), 300),
        seconds: 0,
      };
    }
    result.seconds = (Date.now() - startedAt) / 1000;
    setLinkTest(result);
    setTesting(false);
    toast.style = result.ok ? Toast.Style.Success : Toast.Style.Failure;
    toast.title = result.ok ? "The Test Link Was Read" : "The Test Link Failed";
    toast.message = result.detail;
  }

  const shared = (
    <>
      <ActionPanel.Section>
        <Action
          title="Copy Diagnostics"
          icon={Icon.Clipboard}
          shortcut={Keyboard.Shortcut.Common.Copy}
          onAction={async () => {
            await Clipboard.copy(diagnosticsReport(diagnostics, Date.now(), home));
            await showToast({ style: Toast.Style.Success, title: "Diagnostics Copied" });
          }}
        />
        <Action title="Read a Test Link" icon={Icon.Network} onAction={testLink} />
        <Action
          title="Check Again"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => setRun((n) => n + 1)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.Push title="Update Libraries" icon={Icon.Hammer} target={<Updater />} />
        <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        <Action.OpenInBrowser title="Report a Problem" icon={Icon.Bug} url={ISSUE_URL} />
      </ActionPanel.Section>
    </>
  );

  const testIcon: Image.ImageLike = testing
    ? { source: Icon.CircleProgress, tintColor: Color.Blue }
    : linkTest
      ? linkTest.ok
        ? { source: Icon.CheckCircle, tintColor: Color.Green }
        : { source: Icon.XMarkCircle, tintColor: Color.Red }
      : { source: Icon.Network, tintColor: Color.SecondaryText };

  return (
    <List
      isLoading={tools === undefined || tools.some((tool) => tool.checking) || testing}
      searchBarPlaceholder="Search tools"
    >
      <List.Section title="Tools" subtitle={tools ? summary(tools, now) : undefined}>
        {(tools ?? []).map((tool) => {
          const verdict = toolVerdict(tool, now);
          return (
            <List.Item
              key={tool.id}
              title={tool.id === "ffprobe" ? "ffprobe" : toolInfoFor(tool.id).name}
              subtitle={tool.purpose}
              icon={{ source: STATE_ICON[verdict.state], tintColor: STATE_COLOR[verdict.state] }}
              accessories={[
                ...(tool.fromPreference ? [{ icon: Icon.Gear, tooltip: "Its path is set in preferences" }] : []),
                ...(tool.version ? [{ text: displayVersion(tool.version), tooltip: tool.version }] : []),
                {
                  tag: { value: verdict.label, color: STATE_COLOR[verdict.state] },
                  tooltip: verdict.detail ?? withoutHome(tool.path, home),
                },
              ]}
              actions={
                <ActionPanel>
                  {shared}
                  <ActionPanel.Section>
                    <Action.CopyToClipboard
                      title="Copy Path"
                      content={tool.path}
                      shortcut={Keyboard.Shortcut.Common.CopyPath}
                    />
                    {tool.found && <Action.ShowInFinder path={tool.path} />}
                    {toolInfoFor(tool.id).homepage && (
                      <Action.OpenInBrowser title="Open Its Website" url={toolInfoFor(tool.id).homepage} />
                    )}
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {tools !== undefined && (
        <List.Section title="This Computer">
          <List.Item
            title="Test Link"
            subtitle={linkTest ? linkTest.detail : "Reads a short YouTube video's details with yt-dlp"}
            icon={testIcon}
            accessories={linkTest ? [{ text: `${linkTest.seconds.toFixed(1)}s` }] : [{ text: "Press ↵ to run" }]}
            actions={
              <ActionPanel>
                <Action title="Read a Test Link" icon={Icon.Network} onAction={testLink} />
                {shared}
              </ActionPanel>
            }
          />
          <List.Item
            title="Download Folder"
            subtitle={withoutHome(folder.path, home)}
            icon={
              folder.writable
                ? { source: Icon.Folder, tintColor: Color.Green }
                : { source: Icon.ExclamationMark, tintColor: Color.Red }
            }
            accessories={[
              folder.writable
                ? { tag: { value: "OK", color: Color.Green } }
                : { tag: { value: "Can't Be Written To", color: Color.Red } },
            ]}
            actions={<ActionPanel>{shared}</ActionPanel>}
          />
          <List.Item
            title="System"
            subtitle={diagnostics.system}
            icon={Icon.ComputerChip}
            accessories={[{ text: `Raycast ${diagnostics.raycast}` }]}
            actions={<ActionPanel>{shared}</ActionPanel>}
          />
        </List.Section>
      )}
    </List>
  );
}
