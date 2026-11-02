import {
  Action,
  ActionPanel,
  Application,
  Clipboard,
  Color,
  confirmAlert,
  Form,
  getApplications,
  Icon,
  List,
  open,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { showFailureToast, useCachedPromise, usePromise } from "@raycast/utils";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ReactNode, useEffect, useRef, useState } from "react";

import {
  actionsFor,
  applyPreset,
  Binding,
  BuiltInId,
  BUTTONS,
  ButtonId,
  SWIPES,
  bindingsPath,
  buttonTitle,
  DictationApp,
  dictationWithoutApp,
  clearMapping,
  forgetDevice,
  isBuiltIn,
  isDictate,
  isKey,
  isUrl,
  KEYS,
  KeyId,
  configProblem,
  mappingFor,
  migrateDictationApp,
  MODIFIERS,
  ModifierId,
  presetWouldReplace,
  readBindings,
  readDevice,
  readHand,
  setHand,
  setButtonApp,
  setMapping,
  Target,
} from "./bindings";
import { runningApps, suggestApps } from "./apps";
import ChooseWave from "./choose-wave";
import WaveStatus from "./wave-status";
import { collectDiagnostics } from "./diagnostics";
import { applyFix, restartListener } from "./fixes";
import { extensionFolder, helperPath, identify, readListenerLog, readPublishedStatus } from "./helper";
import * as listener from "./listener";
import { accessibilityProblem, dictationOutputProblem } from "./setup";
import { Fix, fixFor, listenerTrouble, onboarding, readingAge, ringState, RingState, shortTarget } from "./summary";

function useBindings() {
  const [bindings, setBindings] = useState<Binding[]>(() => readBindings());
  return { bindings, reload: () => setBindings(readBindings()) };
}

const RING: Record<RingState, { text: string; color: Color }> = {
  connected: { text: "Ring connected", color: Color.Green },
  unresponsive: { text: "Ring not responding", color: Color.Red },
  bluetoothOff: { text: "Bluetooth is off", color: Color.Orange },
  bluetoothDenied: { text: "Bluetooth not allowed", color: Color.Orange },
  forgotten: { text: "Ring forgotten", color: Color.Orange },
  oldFirmware: { text: "Ring firmware too old", color: Color.Orange },
  searching: { text: "Looking for ring…", color: Color.Yellow },
  disconnected: { text: "Ring disconnected", color: Color.Orange },
  unknown: { text: "Ring status unknown", color: Color.SecondaryText },
};

async function copyDiagnostics() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Collecting diagnostics…" });
  try {
    await Clipboard.copy(await collectDiagnostics());
    toast.style = Toast.Style.Success;
    toast.title = "Diagnostics copied";
    toast.message = "Paste them to Genki";
  } catch (e) {
    await toast.hide();
    await showFailureToast(e, { title: "Couldn't collect diagnostics" });
  }
}

export default function ConfigureButtons() {
  const { bindings, reload } = useBindings();
  const running = usePromise(listener.isRunning);
  const agent = usePromise(listener.agentStatus);
  // Files only: opening this screen must never touch the ring (Softwave may be using it).
  const status = readPublishedStatus();
  const device = readDevice();
  const log = readListenerLog();
  const ring = running.data ? ringState(log) : undefined;
  const [hand, setHandState] = useState(() => readHand());

  // The listener runs in the background on its own (launchd starts it at login and keeps
  // it running); this only covers the first run, or one that was removed.
  const autoStarted = useRef(false);
  useEffect(() => {
    // Older configs share one dictation app; move it onto each dictation button, but only
    // once the listener runs a helper that reads it there (after a store update, `update`).
    const migrate = () => migrateDictationApp() && reload();
    if (running.data === false) migrate();
    // After a store update, move a running listener onto the new helper.
    if (running.data === true) {
      helperPath()
        .then((helper) => listener.update(helper, extensionFolder()))
        .catch(() => undefined)
        .then(migrate);
      return;
    }
    if (running.data !== false || autoStarted.current) return;
    autoStarted.current = true;
    helperPath()
      .then((helper) => listener.start(helper, extensionFolder()))
      .then(() => running.revalidate())
      .catch((e) => showFailureToast(e, { title: "Couldn't start Wave" }));
  }, [running.data]);

  // Re-read the listener's log every second while open (a few milliseconds of work), so a ring
  // that connects, drops or stops responding shows up live.
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
      running.revalidate();
      agent.revalidate();
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  // Loaded isn't running: launchd may be failing to start the helper at all.
  const trouble = agent.data ? listenerTrouble(agent.data) : undefined;
  const guide = onboarding({ running: running.data === true, trouble, ring });
  const fix = running.data === undefined ? undefined : fixFor({ running: running.data, trouble, ring });
  const fixId = fix?.fix === "chooseWave" ? undefined : fix?.fix;

  const switchHand = async () => {
    const next = hand === "left" ? "right" : "left";
    setHand(bindingsPath(), next);
    setHandState(next);
    // The listener sets up swipe recognition for a hand when it connects.
    await restartListener();
    await showToast({ style: Toast.Style.Success, title: `Ring on ${next} hand`, message: "Swipes adjusted" });
  };
  const usesDictation = bindings.some(isDictate);
  const missingApp = dictationWithoutApp(bindings);
  const badConfig = configProblem();
  const outputProblem = usesDictation && dictationOutputProblem(log);
  const needsAccessibility = running.data === true && accessibilityProblem(log);

  const refresh = () => {
    running.revalidate();
    reload();
  };

  const battery = ring === "connected" ? status?.battery : undefined;
  const statusAccessories: List.Item.Accessory[] = [
    ...(battery
      ? [
          {
            icon: battery.isCharging ? Icon.BatteryCharging : Icon.Battery,
            text: `${Math.round(battery.percentage)}%`,
            tooltip: `${battery.voltage.toFixed(2)} V, ${readingAge(status?.updatedAt, Date.now()) ?? ""}`,
          },
        ]
      : []),
  ];

  const commonActions = (
    <>
      <Action.Push
        title="Choose Wave…"
        icon={Icon.Bluetooth}
        shortcut={{ modifiers: ["cmd"], key: "b" }}
        target={<ChooseWave />}
        onPop={refresh}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={refresh}
      />
    </>
  );

  return (
    // Only while first loading: every 2 s poll would otherwise flash the loading bar.
    <List isLoading={running.data === undefined} searchBarPlaceholder="Filter buttons, apps or actions">
      {(missingApp.length > 0 || outputProblem || needsAccessibility || badConfig) && (
        <List.Section title="Setup" subtitle="Needs attention">
          {badConfig && (
            <List.Item
              icon={{ source: Icon.Warning, tintColor: Color.Red }}
              title="Your button settings can't be read"
              subtitle="Fix the file, or nothing can be saved"
              accessories={[{ text: badConfig.split(": ").slice(1).join(": ") }]}
              actions={
                <ActionPanel>
                  <Action.Open title="Open Bindings File" icon={Icon.Document} target={bindingsPath()} />
                  {commonActions}
                </ActionPanel>
              }
            />
          )}
          {needsAccessibility && (
            <List.Item
              icon={{ source: Icon.Warning, tintColor: Color.Orange }}
              title="Allow wave-helper in Accessibility"
              subtitle="Needed to press keys and type dictation into other apps; asked once"
              actions={
                <ActionPanel>
                  <Action.Open
                    title="Open Accessibility Settings"
                    icon={Icon.Gear}
                    target="x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
                  />
                  <Action
                    title="Reconnect"
                    icon={Icon.ArrowClockwise}
                    onAction={async () => {
                      await restartListener();
                      refresh();
                    }}
                  />
                  {commonActions}
                </ActionPanel>
              }
            />
          )}
          {missingApp.map((button) => (
            <List.Item
              key={button}
              icon={{ source: Icon.Warning, tintColor: Color.Orange }}
              title={`Choose where ${buttonTitle(button)} dictates`}
              subtitle="Dictation is typed into this app, and you stay where you are"
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Choose App…"
                    icon={Icon.AppWindow}
                    target={
                      <AppPicker
                        title={`${buttonTitle(button)} Dictates Into`}
                        onPick={async (picked) => {
                          setButtonApp(bindingsPath(), button, picked);
                          reload();
                          await showToast({
                            style: Toast.Style.Success,
                            title: `${buttonTitle(button)} → ${picked.name}`,
                          });
                        }}
                      />
                    }
                  />
                  {commonActions}
                </ActionPanel>
              }
            />
          ))}
          {outputProblem && (
            <List.Item
              icon={{ source: Icon.Warning, tintColor: Color.Orange }}
              title="Raycast Dictation isn't copying its transcript"
              subtitle="Raycast Settings → Extensions → Dictation → Output: Copy to Clipboard"
              actions={
                <ActionPanel>
                  <Action.Open title="Open Log" icon={Icon.Document} target={listener.logPath()} />
                  {commonActions}
                </ActionPanel>
              }
            />
          )}
        </List.Section>
      )}
      <List.Section title="Wave">
        <List.Item
          icon={{ source: Icon.CircleFilled, tintColor: ring ? RING[ring].color : Color.SecondaryText }}
          title={guide.title ?? "Wave connected"}
          subtitle={guide.subtitle ?? (device ? `Wave ${device.address}` : undefined)}
          accessories={statusAccessories}
          actions={
            <ActionPanel>
              {fix && fixId && (
                <Action
                  title={fix.title}
                  icon={FIX_ICONS[fixId]}
                  onAction={async () => {
                    const toast = await showToast({ style: Toast.Style.Animated, title: `${fix.title}…` });
                    try {
                      toast.title = await applyFix(fixId);
                      toast.style = Toast.Style.Success;
                      refresh();
                    } catch (e) {
                      await toast.hide();
                      await showFailureToast(e, { title: `Couldn't ${fix.title.toLowerCase()}` });
                    }
                  }}
                />
              )}
              <Action.Push title="Choose Wave…" icon={Icon.Bluetooth} target={<ChooseWave />} onPop={refresh} />
              <Action.Push title="Show Ring Details" icon={Icon.Info} target={<WaveStatus />} />
              <Action
                title="Copy Diagnostics"
                icon={Icon.Clipboard}
                shortcut={Keyboard.Shortcut.Common.Copy}
                onAction={copyDiagnostics}
              />
              {device && (
                <Action
                  title="Forget This Wave"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={async () => {
                    forgetDevice(bindingsPath());
                    await restartListener();
                    refresh();
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Forgot Wave",
                      message: "It won't reconnect until you choose it again",
                    });
                  }}
                />
              )}
              <Action
                title="Identify Ring"
                icon={Icon.Eye}
                shortcut={{ modifiers: ["cmd"], key: "i" }}
                onAction={async () => {
                  try {
                    await identify();
                    await showToast({ style: Toast.Style.Success, title: "Look for the flashing ring" });
                  } catch (e) {
                    await showFailureToast(e, { title: "Identify failed" });
                  }
                }}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={refresh}
              />
              <ActionPanel.Section>
                <Action.Open title="Open Log" icon={Icon.Document} target={listener.logPath()} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      </List.Section>
      {(
        [
          ["Buttons", "Click or hold", BUTTONS],
          ["Swipes", `Ring on ${hand} hand`, SWIPES],
        ] as const
      ).map(([title, subtitle, slots]) => (
        <List.Section key={title} title={title} subtitle={subtitle}>
          {slots.map((button) => (
            <ButtonItem
              key={button.id}
              button={button.id}
              mapping={mappingFor(bindings, button.id)}
              onChange={reload}
              extraActions={
                <>
                  {title === "Swipes" && (
                    <ActionPanel.Section>
                      <Action
                        title={hand === "left" ? "Ring on Right Hand" : "Ring on Left Hand"}
                        icon={Icon.Switch}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
                        onAction={switchHand}
                      />
                    </ActionPanel.Section>
                  )}
                  <ActionPanel.Section>
                    <Action
                      title="Apply Presentation Preset"
                      icon={Icon.Monitor}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                      onAction={async () => {
                        const replaced = presetWouldReplace(bindings, "presentation");
                        const ok = await confirmAlert({
                          title: "Apply Presentation preset?",
                          message:
                            "Top / swipe left: previous slide\nMiddle / swipe right: next slide\nBottom: dictate\n\n" +
                            (replaced.length
                              ? "Replaces:\n" +
                                replaced.map((b) => `${buttonTitle(b.button)} → ${shortTarget(b)}`).join("\n")
                              : "Nothing else is mapped on these buttons."),
                          primaryAction: { title: "Apply" },
                        });
                        if (!ok) return;
                        applyPreset(bindingsPath(), "presentation");
                        reload();
                        await showToast({ style: Toast.Style.Success, title: "Presentation preset applied" });
                      }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    {commonActions}
                    <Action.Open title="Open Bindings File" icon={Icon.Document} target={bindingsPath()} />
                  </ActionPanel.Section>
                </>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

const FIX_ICONS: Record<Exclude<Fix, "chooseWave">, Icon> = {
  reinstallListener: Icon.Hammer,
  startListener: Icon.Play,
  enableBluetooth: Icon.Bluetooth,
  bluetoothSettings: Icon.Gear,
  updateFirmware: Icon.Download,
  restartListener: Icon.ArrowClockwise,
};

const BUILT_IN_ICONS: Record<BuiltInId, Icon> = {
  nextSlide: Icon.ArrowRight,
  previousSlide: Icon.ArrowLeft,
  startSlideshow: Icon.Play,
  blackScreen: Icon.CircleFilled,
  whiteScreen: Icon.Circle,
  playPause: Icon.Play,
  nextTrack: Icon.Forward,
  previousTrack: Icon.Rewind,
  muteAudio: Icon.SpeakerOff,
  volume: Icon.SpeakerHigh,
};

const mappingIcon = (m: Target) =>
  isBuiltIn(m) ? BUILT_IN_ICONS[m.command] : isDictate(m) ? Icon.Microphone : isKey(m) ? Icon.Keyboard : Icon.Link;

/** Asks which app a button dictates into, then saves the dictation mapping. */
function DictationAppPicker(props: { button: ButtonId; submit: boolean; current?: DictationApp; onSaved: () => void }) {
  const { button, submit, current } = props;
  return (
    <AppPicker
      current={current?.bundleId}
      title={`${buttonTitle(button)} Dictates Into`}
      onPick={async (picked) => {
        // Keep the background setting when only the mode changes.
        const app = current?.bundleId === picked.bundleId ? current : picked;
        setMapping(bindingsPath(), button, { command: "dictate", submit, app });
        props.onSaved();
        await showToast({
          style: Toast.Style.Success,
          title: `${buttonTitle(button)} → ${shortTarget({ command: "dictate", submit, app })}`,
        });
      }}
    />
  );
}

/** One button, one mapping. ↵ configures, ⌘↵ dictates & sends, ⌃X clears it. */
function ButtonItem(props: { button: ButtonId; mapping?: Binding; onChange: () => void; extraActions: ReactNode }) {
  const { button, mapping, onChange } = props;
  const dictation = mapping && isDictate(mapping) ? mapping : undefined;
  const missingApp = dictation && !dictation.app;

  return (
    <List.Item
      icon={
        mapping
          ? { source: mappingIcon(mapping), tintColor: missingApp ? Color.Orange : Color.Blue }
          : { source: Icon.Circle, tintColor: Color.SecondaryText }
      }
      title={button.startsWith("swipe") ? buttonTitle(button) : `${buttonTitle(button)} Button`}
      // The list filters on titles and keywords, not subtitles: make "dictate", "slack", "next slide" find buttons.
      keywords={mapping ? [shortTarget(mapping), ...(dictation?.app ? [dictation.app.name] : [])] : []}
      subtitle={mapping ? shortTarget(mapping) + (missingApp ? " · choose an app" : "") : "Not mapped"}
      accessories={
        mapping && isUrl(mapping)
          ? [{ icon: Icon.Link, tooltip: mapping.url }]
          : dictation?.app?.background === false
            ? [{ icon: Icon.AppWindow, tooltip: "Brought forward to paste" }]
            : []
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Configure"
              icon={Icon.Gear}
              target={<MappingPicker button={button} mapping={mapping} onChange={onChange} />}
            />
            {/* Second in the panel, so Raycast gives it ⌘↵. Always asks where, unless it already knows. */}
            {dictation?.app ? (
              !dictation.submit && (
                <Action
                  title="Switch to Dictate & Send"
                  icon={Icon.Microphone}
                  onAction={async () => {
                    const target = { command: "dictate" as const, submit: true, app: dictation.app };
                    setMapping(bindingsPath(), button, target);
                    onChange();
                    await showToast({
                      style: Toast.Style.Success,
                      title: `${buttonTitle(button)} → ${shortTarget(target)}`,
                    });
                  }}
                />
              )
            ) : (
              <Action.Push
                title="Dictate & Send…"
                icon={Icon.Microphone}
                target={<DictationAppPicker button={button} submit={true} onSaved={onChange} />}
              />
            )}
          </ActionPanel.Section>
          {dictation && (
            <ActionPanel.Section>
              <Action.Push
                title={dictation.app ? "Change App…" : "Choose App…"}
                icon={Icon.AppWindow}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                target={
                  <DictationAppPicker
                    button={button}
                    submit={dictation.submit ?? false}
                    current={dictation.app}
                    onSaved={onChange}
                  />
                }
              />
              {dictation.app && (
                <Action
                  title={dictation.app.background === false ? "Type in Background" : "Bring to Front When Pasting"}
                  icon={dictation.app.background === false ? Icon.EyeDisabled : Icon.AppWindow}
                  onAction={async () => {
                    const app = dictation.app!;
                    const background = app.background === false;
                    setButtonApp(bindingsPath(), button, { ...app, background });
                    onChange();
                    await showToast({
                      style: Toast.Style.Success,
                      title: background ? "Typing in the background" : `Bringing ${app.name} forward to paste`,
                    });
                  }}
                />
              )}
            </ActionPanel.Section>
          )}
          {mapping && (
            <ActionPanel.Section>
              {isUrl(mapping) && <Action title="Run Now" icon={Icon.Play} onAction={() => open(mapping.url)} />}
              <Action
                title="Remove Mapping"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={async () => {
                  clearMapping(bindingsPath(), button);
                  onChange();
                  await showToast({ style: Toast.Style.Success, title: `${buttonTitle(button)} cleared` });
                }}
              />
            </ActionPanel.Section>
          )}
          {props.extraActions}
        </ActionPanel>
      }
    />
  );
}

/** Everything a button or swipe can do, as a searchable list; picking one saves it. */
function MappingPicker(props: { button: ButtonId; mapping?: Binding; onChange: () => void }) {
  const { pop } = useNavigation();
  const { button, mapping } = props;
  const current = (target: Target) =>
    mapping !== undefined && JSON.stringify({ button, action: mapping.action, ...target }) === JSON.stringify(mapping);

  const choose = (target: Target, label: string) => async () => {
    setMapping(bindingsPath(), button, target);
    props.onChange();
    pop();
    await showToast({ style: Toast.Style.Success, title: `${buttonTitle(button)} → ${label}` });
  };

  const item = (key: string, title: string, icon: Icon, target: Target, subtitle?: string) => (
    <List.Item
      key={key}
      icon={{ source: icon, tintColor: current(target) ? Color.Blue : undefined }}
      title={title}
      subtitle={subtitle}
      accessories={current(target) ? [{ tag: { value: "Current", color: Color.Blue } }] : []}
      actions={
        <ActionPanel>
          <Action title="Use" icon={Icon.Check} onAction={choose(target, title)} />
        </ActionPanel>
      }
    />
  );

  // The form pops itself after saving; pop this picker too, back to the buttons.
  const saved = () => {
    props.onChange();
    pop();
  };

  const swipe = button.startsWith("swipe");
  // Switching between Send and Draft keeps the button's app; without one, ask for it.
  const ownApp = mapping && isDictate(mapping) ? mapping.app : undefined;
  const dictationItem = (key: string, title: string, submit: boolean, subtitle: string) =>
    ownApp ? (
      item(key, title, Icon.Microphone, { command: "dictate", submit, app: ownApp }, subtitle)
    ) : (
      <List.Item
        key={key}
        icon={Icon.Microphone}
        title={`${title}…`}
        subtitle={subtitle}
        actions={
          <ActionPanel>
            <Action.Push
              title="Choose App"
              icon={Icon.AppWindow}
              target={<DictationAppPicker button={button} submit={submit} onSaved={saved} />}
            />
          </ActionPanel>
        }
      />
    );
  return (
    <List navigationTitle={buttonTitle(button)} searchBarPlaceholder={`What should ${buttonTitle(button)} do?`}>
      <List.Section
        title="Dictation"
        subtitle={swipe ? "Swipe to start, swipe again to finish" : "Hold to talk, or click to start and stop"}
      >
        {dictationItem(
          "send",
          "Dictate & Send",
          true,
          `Typed into ${ownApp?.name ?? "an app you choose"}, then Return`,
        )}
        {dictationItem(
          "draft",
          "Dictate as Draft",
          false,
          `Typed into ${ownApp?.name ?? "an app you choose"}, not sent`,
        )}
        {ownApp && (
          <List.Item
            icon={Icon.AppWindow}
            title="Change App…"
            subtitle={`Now: ${ownApp.name}`}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Choose App"
                  icon={Icon.AppWindow}
                  target={
                    <DictationAppPicker
                      button={button}
                      submit={mapping && isDictate(mapping) ? (mapping.submit ?? false) : true}
                      current={ownApp}
                      onSaved={saved}
                    />
                  }
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
      {(["Slides", "Media"] as const).map((group) => (
        <List.Section key={group} title={group}>
          {actionsFor(button)
            .filter((a) => a.group === group)
            .map((a) => item(a.id, a.title, BUILT_IN_ICONS[a.id], { command: a.id }))}
        </List.Section>
      ))}
      <List.Section title="Custom">
        <List.Item
          icon={{ source: Icon.Link, tintColor: mapping && isUrl(mapping) ? Color.Blue : undefined }}
          title="Raycast Command or URL…"
          subtitle={mapping && isUrl(mapping) ? shortTarget(mapping) : "Run any Raycast command via its deeplink"}
          actions={
            <ActionPanel>
              <Action.Push
                title="Configure"
                icon={Icon.Link}
                target={
                  <DeeplinkForm
                    button={button}
                    url={mapping && isUrl(mapping) ? mapping.url : undefined}
                    onSave={saved}
                  />
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.Keyboard, tintColor: mapping && isKey(mapping) ? Color.Blue : undefined }}
          title="Key…"
          subtitle={mapping && isKey(mapping) ? shortTarget(mapping) : "Press a key in the app in front"}
          actions={
            <ActionPanel>
              <Action.Push
                title="Configure"
                icon={Icon.Keyboard}
                target={
                  <KeyForm button={button} mapping={mapping && isKey(mapping) ? mapping : undefined} onSave={saved} />
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function DeeplinkForm(props: { button: ButtonId; url?: string; onSave: () => void }) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string>();

  return (
    <Form
      navigationTitle={`${buttonTitle(props.button)} Button`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={({ url }: { url: string }) => {
              const trimmed = url.trim();
              if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
                setError("Paste a deeplink or URL, e.g. raycast://extensions/…");
                return;
              }
              setMapping(bindingsPath(), props.button, { url: trimmed });
              props.onSave();
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="Deeplink"
        placeholder="raycast://extensions/…"
        defaultValue={props.url}
        error={error}
        onChange={() => setError(undefined)}
      />
      <Form.Description
        title="Tip"
        text="In Raycast, select any command, press ⌘K and choose “Copy Deeplink”. Any URL works too. It opens the moment you click or press the button."
      />
    </Form>
  );
}

function KeyForm(props: { button: ButtonId; mapping?: { key: KeyId; modifiers?: ModifierId[] }; onSave: () => void }) {
  const { pop } = useNavigation();
  type Values = { key: KeyId } & Record<ModifierId, boolean>;

  return (
    <Form
      navigationTitle={`${buttonTitle(props.button)} Button`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={async (values: Values) => {
              const modifiers = MODIFIERS.map((m) => m.id).filter((id) => values[id]);
              setMapping(bindingsPath(), props.button, { key: values.key, ...(modifiers.length ? { modifiers } : {}) });
              props.onSave();
              pop();
              await showToast({ style: Toast.Style.Success, title: "Key saved" });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="key" title="Key" defaultValue={props.mapping?.key ?? "right"}>
        {KEYS.map((k) => (
          <Form.Dropdown.Item key={k.id} value={k.id} title={`${k.title}  ${k.symbol}`} />
        ))}
      </Form.Dropdown>
      {MODIFIERS.map((m, i) => (
        <Form.Checkbox
          key={m.id}
          id={m.id}
          title={i === 0 ? "Modifiers" : undefined}
          label={`${m.symbol} ${m.title}`}
          defaultValue={props.mapping?.modifiers?.includes(m.id) ?? false}
        />
      ))}
      <Form.Description
        title="Note"
        text="The key goes to whichever app is in front, e.g. → and ← for Keynote, PowerPoint or Google Slides."
      />
    </Form>
  );
}

const runLsappinfo = promisify(execFile);

/** Bundle ids of the apps open right now; Raycast itself is never a dictation target. */
async function openApps(): Promise<string[]> {
  try {
    const { stdout } = await runLsappinfo("/usr/bin/lsappinfo", ["list"]);
    return runningApps(stdout).filter((id) => id !== "com.raycast.macos");
  } catch {
    return [];
  }
}

/** Picks an app to dictate into: what's open now, the usual suspects, then everything installed. */
function AppPicker(props: { current?: string; title?: string; onPick: (app: DictationApp) => Promise<void> }) {
  const { pop } = useNavigation();
  // Cached: listing installed apps takes a moment; show the last list at once and refresh it.
  const apps = useCachedPromise(getApplications);
  const open = useCachedPromise(openApps);
  // Apps installed in two places (e.g. KiCad) share a bundle id; list each once.
  const installed = (apps.data ?? []).filter(
    (a, i, all) => a.bundleId && all.findIndex((b) => b.bundleId === a.bundleId) === i,
  );
  // An app opened twice (`open -n`) is listed once.
  const openIds = [...new Set(open.data ?? [])];
  const openNow = openIds.flatMap((id) => installed.filter((a) => a.bundleId === id));
  const suggested = suggestApps(installed).filter(({ app }) => !openIds.includes(app.bundleId!));
  const listed = new Set([...openNow, ...suggested.map((s) => s.app)].map((a) => a.bundleId));
  const rest = installed.filter((a) => !listed.has(a.bundleId));

  const row = (a: Application, subtitle?: string) => (
    <List.Item
      key={a.bundleId}
      icon={{ fileIcon: a.path }}
      title={a.name}
      subtitle={subtitle}
      accessories={a.bundleId === props.current ? [{ tag: { value: "Current", color: Color.Blue } }] : []}
      actions={
        <ActionPanel>
          <Action
            title="Dictate into This App"
            icon={Icon.Microphone}
            onAction={async () => {
              pop();
              await props.onPick({ bundleId: a.bundleId!, name: a.name });
            }}
          />
        </ActionPanel>
      }
    />
  );

  return (
    <List
      isLoading={apps.isLoading || open.isLoading}
      navigationTitle={props.title ?? "Dictate Into"}
      searchBarPlaceholder="Search apps"
    >
      <List.Section title="Open Now">{openNow.map((a) => row(a, suggestApps([a])[0]?.why))}</List.Section>
      <List.Section title="Suggested">{suggested.map(({ app, why }) => row(app, why))}</List.Section>
      <List.Section title="All Apps">{rest.map((a) => row(a))}</List.Section>
    </List>
  );
}
