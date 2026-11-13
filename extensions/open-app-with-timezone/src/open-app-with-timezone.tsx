import {
  Action,
  Alert,
  ActionPanel,
  Application,
  Color,
  confirmAlert,
  getApplications,
  Icon,
  List,
  showHUD,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { AppRecord, AppRecords, rankApps } from "./ranking";
import { relaunchWithTimeZone } from "./relaunch";
import { readJSON, updateJSON } from "./storage";
import { cityName, localTime, systemTimeZone, TIME_ZONES, utcOffset } from "./time-zones";

const RAYCAST_BUNDLE_IDS = new Set(["com.raycast.macos", "com.raycast.macos.internal"]);
const RECORDS_KEY = "appRecords";
const PINS_KEY = "pinnedApps";
const opening = new Set<string>();

async function openWithTimeZone(app: Application, timeZone: string, onOpened: () => Promise<unknown>) {
  if (opening.has(app.path)) {
    await showToast({ style: Toast.Style.Failure, title: `${app.name} is already being opened` });
    return;
  }
  opening.add(app.path);
  try {
    await relaunch(app, timeZone, onOpened);
  } finally {
    opening.delete(app.path);
  }
}

async function relaunch(app: Application, timeZone: string, onOpened: () => Promise<unknown>) {
  let toast: Promise<Toast> | undefined;
  const onProgress = (title: string) => {
    toast = toast ? toast.then((t) => Object.assign(t, { title })) : showToast({ style: Toast.Style.Animated, title });
  };
  const confirmQuit = () =>
    confirmAlert({
      icon: { fileIcon: app.path },
      title: `Restart ${app.name}?`,
      message: `${app.name} is running. It will be quit and reopened with TZ=${timeZone}; unsaved work may be lost.`,
      primaryAction: { title: "Restart", style: Alert.ActionStyle.Destructive },
    });
  try {
    const result = await relaunchWithTimeZone(app.path, timeZone, { onProgress, confirmQuit });
    if (!result) return;
    const { pid, verified } = result;
    await onOpened();
    await showHUD(
      verified
        ? `${app.name} (pid ${pid}) running with TZ=${timeZone}`
        : `${app.name} (pid ${pid}) launched with TZ=${timeZone} (macOS hides its environment, not verifiable)`,
    );
  } catch (error) {
    await showFailureToast(error, { title: `Failed to open ${app.name}` });
  }
}

export default function Command() {
  const { data: apps = [], isLoading: isLoadingApps } = usePromise(async () =>
    (await getApplications()).filter((app) => !RAYCAST_BUNDLE_IDS.has(app.bundleId ?? "")),
  );
  const {
    data: records = {},
    mutate: mutateRecords,
    isLoading: isLoadingRecords,
  } = usePromise(() => readJSON<AppRecords>(RECORDS_KEY, {}));
  const {
    data: pinnedPaths = [],
    mutate: mutatePins,
    isLoading: isLoadingPins,
  } = usePromise(() => readJSON<string[]>(PINS_KEY, []));
  const { pinned, frequent, rest } = useMemo(() => rankApps(apps, records, pinnedPaths), [apps, records, pinnedPaths]);

  const timeZoneOf = (app: Application) => {
    const tz = records[app.path]?.timeZone;
    return tz && TIME_ZONES.includes(tz) ? tz : systemTimeZone();
  };
  const updateRecord = (app: Application, update: (record?: AppRecord) => AppRecord) =>
    mutateRecords(updateJSON<AppRecords>(RECORDS_KEY, {}, (all) => ({ ...all, [app.path]: update(all[app.path]) })));
  const rememberTimeZone = (app: Application, timeZone: string) =>
    updateRecord(app, (record) => ({ opens: record?.opens ?? 0, timeZone }));
  const open = (app: Application, timeZone: string) =>
    openWithTimeZone(app, timeZone, () =>
      updateRecord(app, (record) => ({ opens: (record?.opens ?? 0) + 1, timeZone })),
    );
  const togglePin = (app: Application) =>
    mutatePins(
      updateJSON<string[]>(PINS_KEY, [], (paths) =>
        paths.includes(app.path) ? paths.filter((path) => path !== app.path) : [...paths, app.path],
      ),
    );

  function renderItem(app: Application, isPinned: boolean) {
    const timeZone = timeZoneOf(app);
    const record = records[app.path];
    return (
      <List.Item
        key={app.path}
        title={app.name}
        icon={{ fileIcon: app.path }}
        keywords={[timeZone]}
        accessories={
          record?.timeZone
            ? [
                {
                  icon: { source: Icon.Globe, tintColor: Color.SecondaryText },
                  text: { value: `${cityName(timeZone)} · ${utcOffset(timeZone)}`, color: Color.SecondaryText },
                  tooltip: `${timeZone} · opened ${record.opens} times`,
                },
              ]
            : []
        }
        actions={
          <ActionPanel>
            <Action title={`Open with ${timeZone}`} icon={Icon.Globe} onAction={() => open(app, timeZone)} />
            <Action.Push
              title="Open with Other Time Zone…"
              icon={Icon.Clock}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
              target={
                <TimeZoneList
                  app={app}
                  current={timeZone}
                  onOpen={(tz) => open(app, tz)}
                  onRemember={(tz) => rememberTimeZone(app, tz)}
                />
              }
            />
            <Action
              title={isPinned ? "Unpin App" : "Pin App"}
              icon={isPinned ? Icon.PinDisabled : Icon.Pin}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              onAction={() => togglePin(app)}
            />
            <Action.ShowInFinder path={app.path} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoadingApps || isLoadingRecords || isLoadingPins} searchBarPlaceholder="Search apps…">
      <List.Section title="Pinned">{pinned.map((app) => renderItem(app, true))}</List.Section>
      <List.Section title="Frequently Used">{frequent.map((app) => renderItem(app, false))}</List.Section>
      <List.Section title="All Apps">{rest.map((app) => renderItem(app, false))}</List.Section>
    </List>
  );
}

function TimeZoneList(props: {
  app: Application;
  current: string;
  onOpen: (tz: string) => Promise<unknown>;
  onRemember: (tz: string) => Promise<unknown>;
}) {
  const { app, current, onOpen, onRemember } = props;
  const { pop } = useNavigation();
  const zones = useMemo(() => TIME_ZONES.map((tz) => ({ tz, offset: utcOffset(tz), time: localTime(tz) })), []);

  return (
    <List navigationTitle={`Open ${app.name} with…`} searchBarPlaceholder="Search time zones" selectedItemId={current}>
      {zones.map(({ tz, offset, time }) => (
        <List.Item
          key={tz}
          id={tz}
          title={tz}
          keywords={[offset]}
          accessories={[
            ...(tz === current
              ? [{ icon: { source: Icon.Checkmark, tintColor: Color.Green }, tooltip: "Current" }]
              : []),
            { text: { value: offset, color: Color.SecondaryText } },
            {
              icon: { source: Icon.Clock, tintColor: Color.SecondaryText },
              text: time,
              tooltip: `Local time in ${tz}`,
            },
          ]}
          actions={
            <ActionPanel>
              <Action title={`Open with ${tz}`} icon={Icon.Globe} onAction={() => onOpen(tz)} />
              <Action
                title={`Remember for ${app.name} Without Opening`}
                icon={Icon.CheckCircle}
                shortcut={Keyboard.Shortcut.Common.Save}
                onAction={async () => {
                  await onRemember(tz);
                  pop();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
