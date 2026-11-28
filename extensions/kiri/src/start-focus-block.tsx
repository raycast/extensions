import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  Icon,
  type LaunchProps,
  openExtensionPreferences,
  popToRoot,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import ConnectView from "./components/ConnectView";
import { lockedSoundCount, playableSounds, refreshMe } from "./lib/account";
import { PRICING_URL } from "./lib/api";
import { defaultFocusMinutes, refreshMenuBar, startFocus, tick } from "./lib/engine";
import { isCached } from "./lib/sound";
import { type Connection, getLastSound, getTimer, setLastSound } from "./lib/storage";
import { formatClock, formatMinutes, parseMinutes, remainingMs, type RunningTimer } from "./lib/timer";

const PRESETS = ["25", "50", "90"];
const CUSTOM = "custom";
const NO_SOUND = "none";

interface Values {
  length: string;
  customMinutes: string;
  task: string;
  sound: string;
}

/** Optional prefill, for deeplinks and scripts: raycast://extensions/Project-Kiri/kiri/start-focus-block?context=… */
interface Prefill {
  task?: string;
  minutes?: number;
  sound?: string;
}

export default function Command(props: LaunchProps<{ launchContext?: Prefill }>) {
  const prefill = props.launchContext ?? {};
  const prefillMinutes = typeof prefill.minutes === "number" ? String(prefill.minutes) : "";
  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [running, setRunning] = useState<RunningTimer | null>(null);
  const [sound, setSound] = useState<string>(NO_SOUND);
  const preferred = prefillMinutes && parseMinutes(prefillMinutes) ? prefillMinutes : String(defaultFocusMinutes());
  const [length, setLength] = useState<string>(PRESETS.includes(preferred) ? preferred : CUSTOM);
  const [customError, setCustomError] = useState<string | undefined>();

  useEffect(() => {
    (async () => {
      await tick();
      const [c, t, last] = await Promise.all([refreshMe(), getTimer(), getLastSound()]);
      setConnection(c);
      setRunning(t);
      const options = playableSounds(c?.me ?? null);
      const wanted = typeof prefill.sound === "string" ? prefill.sound : last;
      setSound(wanted && options.some((s) => s.key === wanted) ? wanted : NO_SOUND);
      setLoading(false);
    })();
  }, []);

  const sounds = playableSounds(connection?.me ?? null);
  const locked = lockedSoundCount(connection?.me ?? null);
  const lockedLabels = (connection?.me?.sounds ?? [])
    .filter((s) => !s.available)
    .map((s) => s.label.toLowerCase())
    .join(", ");

  async function submit(values: Values) {
    const minutes = values.length === CUSTOM ? parseMinutes(values.customMinutes) : Number(values.length);
    if (!minutes) {
      setCustomError("Enter whole minutes from 1 to 120");
      return;
    }
    const key = values.sound === NO_SOUND ? "" : values.sound;
    await setLastSound(key);
    const toast =
      key && !isCached(key)
        ? await showToast({ style: Toast.Style.Animated, title: "Getting the sound ready…" })
        : undefined;
    try {
      await startFocus(minutes, values.task, key);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Try again.";
      await showToast({ style: Toast.Style.Failure, title: "The block started without sound", message });
      return;
    }
    toast?.hide();
    const shown = await refreshMenuBar();
    await closeMainWindow();
    await showHUD(
      shown
        ? `Focus block started · ${formatMinutes(minutes)}`
        : `Focus block started · ${formatMinutes(minutes)}. Run Kiri Timer to see the countdown.`,
    );
    await popToRoot();
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Focus Block" icon={Icon.Play} onSubmit={submit} />
          {!loading && !connection && (
            <Action.Push
              title="Connect Kiri Account"
              icon={Icon.Link}
              target={<ConnectView onConnected={async () => setConnection(await refreshMe(true))} />}
            />
          )}
          {locked > 0 && <Action.OpenInBrowser title="See Kiri Lifetime" url={PRICING_URL} />}
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      {running && (
        <Form.Description
          title="Running"
          text={`A ${running.phase === "focus" ? "focus block" : "break"} has ${formatClock(remainingMs(running, Date.now()))} left. Starting a new block replaces it.`}
        />
      )}
      <Form.Dropdown
        id="length"
        title="Length"
        value={length}
        onChange={(v) => {
          setLength(v);
          setCustomError(undefined);
        }}
      >
        {PRESETS.map((m) => (
          <Form.Dropdown.Item key={m} value={m} title={`${m} minutes`} />
        ))}
        <Form.Dropdown.Item value={CUSTOM} title="Custom…" />
      </Form.Dropdown>
      {length === CUSTOM && (
        <Form.TextField
          id="customMinutes"
          title="Minutes"
          placeholder="1 to 120"
          defaultValue={PRESETS.includes(preferred) ? "" : preferred}
          error={customError}
          onChange={() => setCustomError(undefined)}
          onBlur={(e) => setCustomError(parseMinutes(e.target.value) ? undefined : "Enter whole minutes from 1 to 120")}
        />
      )}
      <Form.TextField
        id="task"
        title="Task"
        placeholder="What will you work on? (optional)"
        defaultValue={typeof prefill.task === "string" ? prefill.task : undefined}
      />
      <Form.Dropdown id="sound" title="Sound" value={sound} onChange={setSound}>
        <Form.Dropdown.Item value={NO_SOUND} title="No Sound" icon={Icon.SpeakerOff} />
        {sounds.map((s) => (
          <Form.Dropdown.Item key={s.key} value={s.key} title={s.label} icon={Icon.SpeakerOn} />
        ))}
      </Form.Dropdown>
      {!loading && !connection && (
        <Form.Description text="Brown noise plays without an account. Connect a free Kiri account (in the actions) to add rain and save your blocks to your Kiri history." />
      )}
      {!loading && connection && locked > 0 && (
        <Form.Description
          text={`Kiri Lifetime adds ${locked === 1 ? "1 more sound" : `${locked} more sounds`}: ${lockedLabels}.`}
        />
      )}
    </Form>
  );
}
