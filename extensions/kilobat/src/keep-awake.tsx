import {
  Action,
  ActionPanel,
  Alert,
  Application,
  closeMainWindow,
  Color,
  confirmAlert,
  getApplications,
  Icon,
  List,
  LocalStorage,
  showHUD,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { execFileSync, spawn } from "node:child_process";
import { awakeCard, NARROW } from "./cards";
import { ErrorView, KilobatAppAction, failureToast } from "./components";
import { image } from "./draw";
import { cliPath, Conditions, kilobat, kilobatRun, NetworkApp, Status } from "./kilobat";

const SESSION_KEY = "awakeSession";

/** The `kilobat awake` this extension started. */
type Session = { pid: number; title: string; until?: number };

type Choice = {
  id: string;
  title: string;
  args: string[];
  icon: Icon;
  minutes?: number;
  /** A lid hold needs the app's power helper and only applies to timed and open-ended sessions. */
  lid?: boolean;
};

const lengths: Choice[] = [
  ...[1, 2, 4, 8].map((hours) => ({
    id: `${hours}h`,
    title: hours === 1 ? "For 1 hour" : `For ${hours} hours`,
    args: ["--for", `${hours}h`],
    icon: Icon.Clock,
    minutes: hours * 60,
    lid: true,
  })),
  { id: "forever", title: "Until I turn it off", args: [], icon: Icon.Mug, lid: true },
];

const time = (date: Date) => date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/** Our session, if its process still runs. */
async function current(): Promise<Session | undefined> {
  const raw = await LocalStorage.getItem<string>(SESSION_KEY);
  if (!raw) return undefined;
  const session = JSON.parse(raw) as Session;
  try {
    const command = execFileSync("/bin/ps", ["-o", "command=", "-p", String(session.pid)], { encoding: "utf8" });
    if (command.includes("kilobat") && command.includes("awake")) return session;
  } catch {
    // ps exits 1 when the process is gone.
  }
  await LocalStorage.removeItem(SESSION_KEY);
  return undefined;
}

async function stop() {
  const session = await current();
  if (session) process.kill(session.pid, "SIGINT");
  await LocalStorage.removeItem(SESSION_KEY);
}

async function start(choice: Choice, settings: Settings, hud: string) {
  try {
    if (settings.lidClosed && choice.lid) {
      const ok = await confirmAlert({
        title: "Keep running with the lid closed?",
        message:
          "A closed Mac in a bag can get hot and drains its battery. Kilobat still lets it sleep at your battery floor, when it runs hot, and after 8 hours at most.",
        primaryAction: { title: "Keep Running", style: Alert.ActionStyle.Default },
      });
      if (!ok) return;
    }
    await stop();
    const args = [
      "awake",
      ...choice.args,
      ...(settings.screen ? ["--display"] : []),
      ...(settings.lidClosed && choice.lid ? ["--lid-closed"] : []),
    ];
    const child = spawn(cliPath(), args, { detached: true, stdio: "ignore" });
    // A CLI that can't run (no execute permission, wrong file) fails asynchronously: wait for it to start.
    await new Promise<void>((resolve, reject) => {
      child.once("spawn", resolve);
      child.once("error", reject);
    });
    child.unref();
    if (child.pid) {
      const session: Session = {
        pid: child.pid,
        title: choice.title,
        until: choice.minutes ? Date.now() + choice.minutes * 60_000 : undefined,
      };
      await LocalStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
    await closeMainWindow();
    await showHUD(hud);
  } catch (error) {
    failureToast(error);
  }
}

type Settings = { screen: boolean; power: boolean; lidClosed: boolean };

async function load() {
  const [conditions, session, all, lidClosed] = await Promise.all([
    kilobat<Conditions & { awakeOnPower?: { enabled: boolean }; lidClosedAllowed?: boolean }>(["conditions", "--json"]),
    current(),
    kilobat<Record<string, string>>(["settings"]).catch(() => ({}) as Record<string, string>),
    LocalStorage.getItem<boolean>("lidClosed"),
  ]);
  const settings: Settings = {
    screen: all["keep-screen-on"] === "on",
    power: conditions.awakeOnPower?.enabled ?? all["awake-on-power"] === "on",
    lidClosed: !!lidClosed && !!conditions.lidClosedAllowed,
  };
  return { conditions, session, settings, lidAllowed: !!conditions.lidClosedAllowed };
}

const onOff = (on: boolean) => ({ tag: { value: on ? "On" : "Off", color: on ? Color.Purple : Color.SecondaryText } });

export default function Command() {
  const { data, isLoading, error, revalidate } = usePromise(load);
  const { push } = useNavigation();
  if (error && !data) return <ErrorView error={error} onRetry={revalidate} />;

  const c = data?.conditions;
  const settings = data?.settings ?? { screen: false, power: false, lidClosed: false };
  const reasons = c?.awakeReasons?.map((reason) => reason.replace(/^Kilobat: /, "")).join(", ");
  const state = {
    awake: !!c?.keptAwake,
    reasons,
    battery: c?.power?.batteryPercent ?? undefined,
    onAC: c?.power?.onAC,
  };
  const screen = settings.screen ? "The Mac and its screen stay on" : "The Mac stays on; the screen may dim";
  const lid = settings.lidClosed ? ", even with the lid closed." : ". Closing the lid still sleeps it.";
  const card = (title: string, headline: string, detail: string) => (
    <List.Item.Detail markdown={image(awakeCard(title, headline, detail, state), NARROW, title)} />
  );

  const session = data?.session;
  const nowTitle = session
    ? session.until
      ? `Awake · until ${time(new Date(session.until))}`
      : `Awake · ${session.title.toLowerCase()}`
    : c?.keptAwake
      ? `Awake · ${reasons ?? "held by another app"}`
      : "Off · your Mac sleeps as usual";

  const toggle = async (key: "keep-screen-on" | "awake-on-power", on: boolean) => {
    try {
      await kilobatRun(["settings", key, on ? "on" : "off"]);
      await showHUD(
        key === "keep-screen-on"
          ? on
            ? "The screen stays on too"
            : "The screen may dim"
          : on
            ? "Awake whenever it's plugged in"
            : "Plugging in no longer keeps it awake",
      );
      revalidate();
    } catch (caught) {
      failureToast(caught);
    }
  };

  const choiceItem = (choice: Choice, hud: string, detail: string, headline?: string) => (
    <List.Item
      key={choice.id}
      title={choice.title}
      icon={choice.icon}
      detail={card(
        choice.title,
        headline ??
          (choice.minutes ? `Until ${time(new Date(Date.now() + choice.minutes * 60_000))}` : "Until you stop it"),
        detail,
      )}
      actions={
        <ActionPanel>
          <Action title="Keep Awake" icon={Icon.Mug} onAction={() => start(choice, settings, hud)} />
          {session ? <Action title="Turn off" icon={Icon.Moon} onAction={() => stop().then(revalidate)} /> : null}
          <KilobatAppAction />
        </ActionPanel>
      }
    />
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Keep Awake"
      isShowingDetail
      searchBarPlaceholder="Keep this Mac awake…"
    >
      {data ? (
        <List.Section title="Now">
          <List.Item
            title={nowTitle}
            icon={{ source: Icon.Mug, tintColor: c?.keptAwake ? Color.Purple : Color.SecondaryText }}
            detail={card(
              "Right now",
              c?.keptAwake ? (session?.until ? `Until ${time(new Date(session.until))}` : "Awake") : "Off",
              c?.keptAwake ? "Something is keeping the Mac awake." : "Your Mac sleeps when it's idle, as usual.",
            )}
            actions={
              <ActionPanel>
                {session ? (
                  <Action
                    title="Turn off"
                    icon={Icon.Moon}
                    onAction={async () => {
                      await stop();
                      await closeMainWindow();
                      await showHUD("Your Mac sleeps as usual again");
                    }}
                  />
                ) : null}
                <KilobatAppAction />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}

      <List.Section title="How long">
        {lengths.map((choice) =>
          choiceItem(
            choice,
            choice.minutes ? `Awake ${choice.title.toLowerCase()}` : "Awake until you turn it off",
            `${screen}${lid}`,
          ),
        )}
      </List.Section>

      <List.Section title="Until">
        {choiceItem(
          { id: "quiet", title: "Until downloads finish", args: ["--until-quiet"], icon: Icon.ArrowDownCircle },
          "Awake until downloads finish",
          "Stays awake while things download, then sleeps once traffic stays under 16 KB/s for 3 minutes.",
          "Until it's quiet",
        )}
        <List.Item
          title="Until one app finishes…"
          icon={Icon.Download}
          detail={card(
            "Until one app finishes",
            "Pick an app",
            "Stays awake while that app downloads, then sleeps once it goes quiet for 3 minutes.",
          )}
          actions={
            <ActionPanel>
              <Action
                title="Choose App"
                icon={Icon.AppWindowList}
                onAction={() => push(<NetworkAppPicker settings={settings} />)}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="While">
        <List.Item
          title="While an app is in front…"
          icon={Icon.AppWindow}
          detail={card(
            "While an app is in front",
            "Pick an app",
            "Awake only while the app you pick is in front, for reading or presenting. Switching away lets the Mac sleep; quitting the app ends it.",
          )}
          actions={
            <ActionPanel>
              <Action
                title="Choose App"
                icon={Icon.AppWindowList}
                onAction={() => push(<FrontmostPicker settings={settings} />)}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {data ? (
        <List.Section title="Options">
          <List.Item
            title="While plugged in"
            icon={Icon.Plug}
            accessories={[onOff(settings.power)]}
            detail={card(
              "While plugged in",
              settings.power ? "On" : "Off",
              "Plugging in keeps the Mac awake until you unplug. Kilobat's own setting, so it works with Raycast closed.",
            )}
            actions={
              <ActionPanel>
                <Action
                  title={settings.power ? "Turn off" : "Turn on"}
                  icon={Icon.Plug}
                  onAction={() => toggle("awake-on-power", !settings.power)}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="Keep the screen on"
            icon={Icon.Monitor}
            accessories={[onOff(settings.screen)]}
            detail={card(
              "Keep the screen on",
              settings.screen ? "On" : "Off",
              "For everything Kilobat keeps awake. Off lets the screen dim while the Mac keeps working.",
            )}
            actions={
              <ActionPanel>
                <Action
                  title={settings.screen ? "Turn off" : "Turn on"}
                  icon={Icon.Monitor}
                  onAction={() => toggle("keep-screen-on", !settings.screen)}
                />
              </ActionPanel>
            }
          />
          {data.lidAllowed ? (
            <List.Item
              title="With the lid closed too"
              icon={Icon.Desktop}
              accessories={[onOff(settings.lidClosed)]}
              detail={card(
                "With the lid closed too",
                settings.lidClosed ? "On" : "Off",
                "Timed and open-ended sessions keep running with the lid shut, 8 hours at most, through Kilobat's power helper.",
              )}
              actions={
                <ActionPanel>
                  <Action
                    title={settings.lidClosed ? "Turn off" : "Turn on"}
                    icon={Icon.Desktop}
                    onAction={async () => {
                      await LocalStorage.setItem("lidClosed", !settings.lidClosed);
                      revalidate();
                    }}
                  />
                </ActionPanel>
              }
            />
          ) : null}
        </List.Section>
      ) : null}
    </List>
  );
}

/** Apps using the network now, busiest first, for "until it finishes". */
function NetworkAppPicker({ settings }: { settings: Settings }) {
  const { data, isLoading } = usePromise(() => kilobat<Status>(["status", "--json"]));
  const apps = new Map<string, NetworkApp>();
  for (const app of data?.apps ?? []) {
    if (app.id.startsWith("process:") && !app.groupPath) continue;
    if (!apps.has(app.id)) apps.set(app.id, app);
  }
  const rate = (app: NetworkApp) => app.downloadBytesPerSecond + app.uploadBytesPerSecond;
  return (
    <List isLoading={isLoading} navigationTitle="Until One App Finishes" searchBarPlaceholder="Find an app…">
      {[...apps.values()]
        .sort((a, b) => rate(b) - rate(a))
        .map((app) => (
          <List.Item
            key={app.id}
            title={app.groupName ?? app.name}
            subtitle={app.groupName && app.groupName !== app.name ? app.name : undefined}
            icon={
              (app.groupPath ?? app.bundlePath)
                ? { fileIcon: (app.groupPath ?? app.bundlePath) as string }
                : Icon.Terminal
            }
            accessories={[{ text: rate(app) >= 1 ? `${Math.round(rate(app) / 1000)} KB/s` : "Idle" }]}
            actions={
              <ActionPanel>
                <Action
                  title="Keep Awake Until It Finishes"
                  icon={Icon.Mug}
                  onAction={() =>
                    start(
                      {
                        id: app.id,
                        title: `Until ${app.groupName ?? app.name} finishes`,
                        args: ["--until-quiet", "--app", app.id],
                        icon: Icon.Download,
                      },
                      settings,
                      `Awake until ${app.groupName ?? app.name} finishes`,
                    )
                  }
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}

/** Installed apps, for "while it's in front". */
function FrontmostPicker({ settings }: { settings: Settings }) {
  const { data, isLoading } = usePromise(() => getApplications());
  return (
    <List
      isLoading={isLoading}
      navigationTitle="While an App Is in Front"
      searchBarPlaceholder="Keynote, Preview, Zoom…"
    >
      {(data ?? [])
        .filter((app: Application) => app.bundleId)
        .map((app: Application) => (
          <List.Item
            key={app.path}
            title={app.name}
            icon={{ fileIcon: app.path }}
            actions={
              <ActionPanel>
                <Action
                  title="Keep Awake While in Front"
                  icon={Icon.Mug}
                  onAction={() =>
                    start(
                      {
                        id: app.bundleId as string,
                        title: `While ${app.name} is in front`,
                        args: ["--while-frontmost", app.bundleId as string],
                        icon: Icon.AppWindow,
                      },
                      settings,
                      `Awake while ${app.name} is in front`,
                    )
                  }
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
