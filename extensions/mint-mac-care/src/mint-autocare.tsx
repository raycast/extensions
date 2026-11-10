import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Detail,
  Form,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { openMint, runMintSurface, shortPath } from "./mint-cli";
import {
  AGE_OPTIONS,
  ALL_TYPES,
  AUTOCARE_MINIMUM_VERSION,
  AutoCareLaunch,
  DiskCareScope,
  DiskRow,
  FolderMode,
  MEMORY_THRESHOLDS,
  ageTitle,
  chipTitle,
  autoCareIsOn,
  autoCareSupported,
  chooserNotes,
  chooserOptions,
  clockText,
  defaultAge,
  diskRequest,
  diskRows,
  folderMode,
  folderRequest,
  folderText,
  folderTimes,
  launchSelection,
  memoryRequest,
  memoryText,
  parseListedTypes,
  yoursConsequence,
  yoursScope,
} from "./mint-care";
import { AutoCareJSON } from "./mint-model";
import { notifyLevel } from "./mint-nudge";
import { mintDefault } from "./mint-saved";
import { MissingMint } from "./missing-mint";
import { useMintCLI } from "./use-mint-cli";
import { usePlanWall } from "./plan-wall";

/** The idle and power rule every disk and folder plan waits for (DiskAutoCare.machineIsReady). */
const WHEN = "every hour, once your Mac has been idle for 10 minutes and is plugged in";

export default function Command(props: LaunchProps<{ launchContext?: AutoCareLaunch }>) {
  const { resolution, recheck } = useMintCLI();
  if (resolution.status !== "ready") return <MissingMint resolution={resolution} onRetry={recheck} />;
  const version = resolution.version.appVersion;
  if (!autoCareSupported(version)) return <NeedsUpdate version={version} />;
  return <AutoCareList cli={resolution.path} launch={props.launchContext} />;
}

/** Before Mint 1.1.2 a disk plan needs a frequency and runs daily: Raycast does not write that shape. */
function NeedsUpdate({ version }: { version?: string }) {
  return (
    <Detail
      markdown={`## Auto Care needs Mint ${AUTOCARE_MINIMUM_VERSION}

${version ? `This Mac has Mint ${version}. ` : ""}Open Mint and choose **Check for Updates**, then come back. Until then, Auto Care is set in Mint.`}
      actions={
        <ActionPanel>
          <Action title="Open Mint" icon={Icon.AppWindow} onAction={openMint} />
        </ActionPanel>
      }
    />
  );
}

function AutoCareList({ cli, launch }: { cli: string; launch?: AutoCareLaunch }) {
  const care = usePromise(
    async (path: string) => {
      const [listed, folders] = await Promise.all([
        runMintSurface<AutoCareJSON>(path, { action: "autocare.list" }, 60_000),
        runMintSurface<{ folders: Array<{ path: string; enabled?: boolean }> }>(
          path,
          { action: "organize.folders" },
          30_000,
        ),
      ]);
      return { care: listed, folders: folders.folders.filter((folder) => folder.enabled !== false) };
    },
    [cli],
    { failureToastOptions: { title: "Mint could not read Auto Care" } },
  );
  // The level Mint tells at while disk Auto Care is off (Mint 1.1.2's Notify me).
  const level = usePromise(async () =>
    notifyLevel(await mintDefault("Mint.Island.FoundNotifyOn"), await mintDefault("Mint.Island.FoundNotifyGB")),
  );
  const listedTypes = usePromise(async () => parseListedTypes(await mintDefault("Mint.AutoCare.ListedTypes.V1")));
  const [busy, setBusy] = useState(false);
  // The plan wall (2026-11-10): when Mint refuses to turn Auto Care on for the plan.
  const wall = usePlanWall(cli);

  const data = care.data?.care;
  const folders = care.data?.folders ?? [];
  const selection =
    launch?.section === "folders" && !launch.folder && folders[0]
      ? `folder:${folders[0].path}`
      : launchSelection(launch);

  /**
   * One write, then Mint's own answer read again: the rows say what Mint saved,
   * never what was asked. True once Mint saved it.
   */
  async function write(title: string, request: Parameters<typeof runMintSurface>[1]): Promise<boolean> {
    setBusy(true);
    const toast = await showToast({ style: Toast.Style.Animated, title });
    try {
      await runMintSurface(cli, request, 60_000);
      await care.revalidate();
      toast.style = Toast.Style.Success;
      toast.title = "Saved in Mint";
      return true;
    } catch (error) {
      // Turning on, refused for the plan: the plan wall, not the error.
      if ((request as { enabled?: boolean }).enabled !== false && (await wall.refused(undefined, "autocare"))) {
        await toast.hide();
        return false;
      }
      toast.style = Toast.Style.Failure;
      toast.title = "Mint did not change Auto Care";
      toast.message = error instanceof Error ? error.message : String(error);
      // The extension's one way to Mint's plans and account: the app itself.
      toast.primaryAction = { title: "Open Mint", onAction: openMint };
      return false;
    } finally {
      setBusy(false);
    }
  }

  const rows = diskRows(data);
  const diskOn = autoCareIsOn(data);
  const memoryShown = data?.memory?.available === true;
  const refresh = (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={() => {
        care.revalidate();
        level.revalidate();
        listedTypes.revalidate();
      }}
    />
  );

  // No switch before Mint's plans are read: a row drawn from nothing looks off with no saved
  // scope, and turning it on would replace a narrower plan Mint already has.
  if (care.error || !data) {
    return (
      <List isLoading={care.isLoading} searchBarPlaceholder="Filter Auto Care">
        {care.error ? (
          <List.EmptyView
            icon={Icon.Warning}
            title="Mint could not read Auto Care"
            description={care.error.message}
            actions={
              <ActionPanel>
                <Action title="Retry" icon={Icon.ArrowClockwise} onAction={care.revalidate} />
                <Action title="Open Mint" icon={Icon.AppWindow} onAction={openMint} />
              </ActionPanel>
            }
          />
        ) : null}
      </List>
    );
  }

  return (
    <List isLoading={care.isLoading || busy} searchBarPlaceholder="Filter Auto Care" selectedItemId={selection}>
      <List.Section title="Disk" subtitle={diskOn ? "Hourly when idle" : "Off"}>
        {rows.map((row) => (
          <DiskItem
            key={row.bucket}
            row={row}
            listed={listedTypes.data}
            locked={data.automationAllowed === false}
            write={write}
            refresh={refresh}
          />
        ))}
        {!diskOn && level.data ? (
          <List.Item
            id="disk:notify"
            icon={Icon.Bell}
            title="Notify me"
            subtitle={level.data.replace(/^Notify me · /, "")}
            accessories={[{ text: "Set in Mint" }]}
            actions={
              <ActionPanel>
                {/* The island's Notify me stays in the app (docs/decisions/raycast.md, 2026-10-31). */}
                <Action title="Change Notify Me in Mint" icon={Icon.Bell} onAction={openMint} />
                {refresh}
              </ActionPanel>
            }
          />
        ) : null}
      </List.Section>
      {memoryShown ? (
        <List.Section title="Memory">
          <MemoryItem care={data} write={write} refresh={refresh} />
        </List.Section>
      ) : null}
      <List.Section title="Folders">
        {folders.map((folder) => (
          <FolderItem key={folder.path} path={folder.path} care={data} write={write} refresh={refresh} />
        ))}
      </List.Section>
    </List>
  );
}

type Write = (title: string, request: Parameters<typeof runMintSurface>[1]) => Promise<boolean>;

function onOff(on: boolean): List.Item.Accessory {
  return on ? { tag: { value: "On", color: Color.Green } } : { text: "Off" };
}

function DiskItem({
  row,
  listed,
  locked,
  write,
  refresh,
}: {
  row: DiskRow;
  listed?: string[];
  locked: boolean;
  write: Write;
  refresh: React.ReactElement;
}) {
  const yours = row.bucket === "clutter";

  /** True once Mint saved it; false when the person said no or Mint did not save it. */
  async function turnOn(scope?: DiskCareScope): Promise<boolean> {
    const used = scope ?? row.savedScope;
    // Optimizable changes no file's contents; the other two remove files, so they ask first.
    if (row.bucket !== "optimizable") {
      const takes = used ? scopeLine(used) : "All types";
      const accepted = await confirmAlert({
        icon: Icon.Clock,
        title: `Turn on Auto Care for ${row.title}?`,
        message:
          row.bucket === "rebuildable"
            ? `Mint permanently deletes what Safe to clean holds (${takes}), ${WHEN}.`
            : `Mint takes your files of these types (${takes}), ${WHEN}. ${yoursConsequence(used)}`,
        primaryAction: { title: "Turn On", style: Alert.ActionStyle.Destructive },
      });
      if (!accepted) return false;
    }
    return write(`Turning on ${row.title}…`, diskRequest(row, true, scope));
  }

  const chooser = (
    <Action.Push
      title={row.on ? "Change Types…" : "Choose Types…"}
      icon={Icon.CheckList}
      target={<YoursTypes row={row} listed={listed} onSave={turnOn} />}
    />
  );

  return (
    <List.Item
      id={`disk:${row.bucket}`}
      icon={{ source: Icon.HardDrive, tintColor: row.on ? Color.Green : Color.SecondaryText }}
      title={row.title}
      subtitle={row.detail}
      accessories={[locked ? { text: "Locked" } : onOff(row.on)]}
      actions={
        <ActionPanel>
          {row.on ? (
            <Action
              title="Turn off Auto Care"
              icon={Icon.XMarkCircle}
              onAction={() => write(`Turning off ${row.title}…`, diskRequest(row, false))}
            />
          ) : yours && !row.savedScope ? (
            chooser
          ) : (
            <Action title="Turn on Auto Care" icon={Icon.CheckCircle} onAction={() => turnOn()} />
          )}
          {yours && (row.on || row.savedScope) ? chooser : null}
          <Action title="Open Mint" icon={Icon.AppWindow} onAction={openMint} />
          {refresh}
        </ActionPanel>
      }
    />
  );
}

function scopeLine(scope: DiskCareScope): string {
  const names = scope.chips.includes(ALL_TYPES) ? "All types" : scope.chips.map((id) => chipTitle(id) ?? id).join(", ");
  return scope.minimumAgeDays > 0 ? `${names}, unused for ${scope.minimumAgeDays}+ days` : names;
}

/**
 * Yours' types beside the popover (DiskCareTypeChooser): what its drawer
 * lists, ticked as the rule has them, and one age for the bucket.
 */
function YoursTypes({
  row,
  listed,
  onSave,
}: {
  row: DiskRow;
  listed?: string[];
  onSave: (scope: DiskCareScope) => Promise<boolean>;
}) {
  const { pop } = useNavigation();
  const saved = row.savedScope;
  const options = chooserOptions(listed, saved?.chips ?? []);
  const [chosen, setChosen] = useState<string[]>(saved?.chips ?? []);
  const [age, setAge] = useState(String(saved?.minimumAgeDays ?? defaultAge("clutter")));
  const toggle = (id: string, on: boolean) =>
    setChosen((current) => {
      if (id === ALL_TYPES) return on ? [ALL_TYPES] : [];
      const rest = current.filter((entry) => entry !== ALL_TYPES && entry !== id);
      return on ? [...rest, id] : rest;
    });
  const conversations = options.some((option) => !option.choosable);
  const notes = chooserNotes(chosen.includes(ALL_TYPES) ? options.map((option) => option.id) : chosen);
  const ages = AGE_OPTIONS.includes(Number(age)) ? AGE_OPTIONS : [...AGE_OPTIONS, Number(age)].sort((a, b) => a - b);

  return (
    <Form
      navigationTitle="Yours"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Turn on Yours"
            icon={Icon.CheckCircle}
            onSubmit={async () => {
              const scope = yoursScope(chosen, Number(age));
              if (!scope) {
                await showToast({ style: Toast.Style.Failure, title: "Choose what it may take" });
                return;
              }
              // The form keeps its choices until Mint has saved them.
              if (await onSave(scope)) pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Choose what it may take" />
      <Form.Checkbox
        id={ALL_TYPES}
        label="All types"
        value={chosen.includes(ALL_TYPES)}
        onChange={(on) => toggle(ALL_TYPES, on)}
      />
      {options
        .filter((option) => option.choosable)
        .map((option) => (
          <Form.Checkbox
            key={option.id}
            id={option.id}
            label={option.listed ? option.title : `${option.title} (nothing on this Mac now)`}
            value={chosen.includes(option.id) || chosen.includes(ALL_TYPES)}
            onChange={(on) => toggle(option.id, on)}
          />
        ))}
      <Form.Dropdown id="age" title="Older than" value={age} onChange={setAge}>
        {ages.map((days) => (
          <Form.Dropdown.Item key={days} value={String(days)} title={ageTitle(days)} />
        ))}
      </Form.Dropdown>
      {conversations ? <Form.Description text="Conversations are always yours to delete." /> : null}
      {notes.map((note) => (
        <Form.Description key={note} text={note} />
      ))}
    </Form>
  );
}

function MemoryItem({
  care,
  write,
  refresh,
}: {
  care: AutoCareJSON | undefined;
  write: Write;
  refresh: React.ReactElement;
}) {
  const on = care?.memory?.enabled === true;
  const threshold = care?.memory?.threshold;
  return (
    <List.Item
      id="memory"
      icon={{ source: Icon.MemoryChip, tintColor: on ? Color.Green : Color.SecondaryText }}
      title="Memory"
      subtitle={memoryText(care)}
      accessories={[care?.automationAllowed === false ? { text: "Locked" } : onOff(on)]}
      actions={
        <ActionPanel>
          <Action
            title={on ? "Turn off Memory Auto Care" : "Turn on Memory Auto Care"}
            icon={on ? Icon.XMarkCircle : Icon.CheckCircle}
            onAction={async () => {
              if (!on) {
                const accepted = await confirmAlert({
                  icon: Icon.MemoryChip,
                  title: `Turn on Memory Auto Care at ${threshold ?? 92}%?`,
                  message:
                    "Helps your Mac stay responsive by quitting eligible apps above this limit, idle first. Protected apps and ongoing work stay open.",
                  primaryAction: { title: "Turn On" },
                });
                if (!accepted) return;
              }
              await write(on ? "Turning off Memory…" : "Turning on Memory…", memoryRequest(care, { enabled: !on }));
            }}
          />
          <Action title="Open Mint" icon={Icon.AppWindow} onAction={openMint} />
          <ActionPanel.Submenu title="Starts at…" icon={Icon.Gauge} shortcut={{ modifiers: ["cmd"], key: "t" }}>
            {MEMORY_THRESHOLDS.map((value) => (
              <Action
                key={value}
                title={`${value}%`}
                icon={value === threshold ? Icon.Checkmark : undefined}
                onAction={() => write(`Starts at ${value}%…`, memoryRequest(care, { threshold: value }))}
              />
            ))}
          </ActionPanel.Submenu>
          {refresh}
        </ActionPanel>
      }
    />
  );
}

function FolderItem({
  path,
  care,
  write,
  refresh,
}: {
  path: string;
  care: AutoCareJSON | undefined;
  write: Write;
  refresh: React.ReactElement;
}) {
  const name = path.split("/").filter(Boolean).pop() ?? path;
  const { mode, timeMinutes } = folderMode(path, care);

  async function set(next: FolderMode, minutes = timeMinutes) {
    if (next !== "manual") {
      const accepted = await confirmAlert({
        icon: Icon.Folder,
        title: `Organize ${name} automatically?`,
        message:
          next === "daily"
            ? `Organize runs once a day at the chosen time (${clockText(minutes)}). Undo Mint Action puts files back.`
            : "New files are filed after the folder goes quiet. Undo Mint Action puts files back.",
        primaryAction: { title: "Turn On" },
      });
      if (!accepted) return;
    }
    const label =
      next === "manual" ? "Turning off" : next === "daily" ? `Daily at ${clockText(minutes)}` : "As files arrive";
    await write(`${name}: ${label}…`, folderRequest(path, next, minutes));
  }

  return (
    <List.Item
      id={`folder:${path}`}
      icon={{ fileIcon: path }}
      title={name}
      subtitle={shortPath(path)}
      accessories={[
        mode === "manual"
          ? { text: folderText(path, care) }
          : { tag: { value: folderText(path, care), color: Color.Green } },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Submenu title="Daily at…" icon={Icon.Clock}>
            {folderTimes(timeMinutes).map((minutes) => (
              <Action
                key={minutes}
                title={clockText(minutes)}
                icon={mode === "daily" && minutes === timeMinutes ? Icon.Checkmark : undefined}
                onAction={() => set("daily", minutes)}
              />
            ))}
          </ActionPanel.Submenu>
          <Action title="Open Mint" icon={Icon.AppWindow} onAction={openMint} />
          {mode !== "onArrival" ? (
            <Action
              title="As Files Arrive"
              icon={Icon.Download}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              onAction={() => set("onArrival")}
            />
          ) : null}
          {mode !== "manual" ? (
            <Action
              title="Turn off Auto Care"
              icon={Icon.XMarkCircle}
              shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
              onAction={() => set("manual")}
            />
          ) : null}
          {refresh}
        </ActionPanel>
      }
    />
  );
}
