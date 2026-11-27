import { Action, ActionPanel, Color, Form, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { effects, errorMessage, send, type Effect, type Request, type State } from "./helper";

type Command = (request: Request) => Promise<boolean>;

const audioSettings = "x-apple.systempreferences:com.apple.preference.security?Privacy_AudioCapture";
const onOff = (enabled: boolean) => (enabled ? "On" : "Off");

export default function ControlLidLight() {
  const [state, setState] = useState<State>();
  const [problem, setProblem] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [stopped, setStopped] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    let mounted = true;
    let polling = false;

    async function refresh(launch: boolean) {
      if (busy.current || polling) return;
      polling = true;
      try {
        const updated = await send({ operation: "status" }, launch);
        if (mounted && !busy.current) {
          setState(updated);
          setProblem(undefined);
        }
      } catch (error) {
        if (mounted && !busy.current) {
          setState(undefined);
          setProblem(errorMessage(error));
        }
      } finally {
        polling = false;
        if (mounted) setLoading(false);
      }
    }

    if (stopped) return;
    void refresh(true);
    const interval = setInterval(() => void refresh(false), 1250);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [stopped]);

  const command: Command = async (request) => {
    if (busy.current) return false;
    busy.current = true;
    setLoading(true);
    try {
      const updated = await send(request);
      setState(updated);
      setProblem(undefined);
      if (request.operation === "quit") setStopped(true);
      return true;
    } catch (error) {
      await showToast(Toast.Style.Failure, "Lid Light", errorMessage(error));
      return false;
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  if (stopped || !state) {
    const title = stopped ? "Helper Stopped" : problem ? "Lid Light Unavailable" : "Connecting to Lid Light";
    return (
      <List isLoading={loading} searchBarPlaceholder="Search lid light controls">
        <List.EmptyView
          title={title}
          description={problem}
          icon={Icon.LightBulb}
          actions={
            <ActionPanel>
              <Action title="Start Lid Light" icon={Icon.Play} onAction={async () => {
                if (await command({ operation: "status" })) setStopped(false);
              }} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (!state.supported || state.originalRunning) {
    return (
      <List searchBarPlaceholder="Search lid light controls" isLoading={loading}>
        <List.EmptyView
          title={state.originalRunning ? "LogoLight Is Running" : "Illuminated Logo Unavailable"}
          description={state.originalRunning
            ? "Quit LogoLight to control the lid light from Raycast."
            : "Lid Light requires a MacBook Pro with PROLED XDR Display."}
          icon={Icon.LightBulb}
          actions={state.originalRunning ? (
            <ActionPanel>
              <Action
                title="Quit LogoLight and Take Control"
                icon={Icon.ArrowRight}
                onAction={() => command({ operation: "takeOver" })}
              />
            </ActionPanel>
          ) : undefined}
        />
      </List>
    );
  }

  const lightOn = state.setting === "on";
  const brightness = `${state.brightness}%${state.battery ? " · Battery" : ""}`;
  const effectTitle = state.chargingNow ? "Breathe · Charging" : effects[state.effect];
  const morseTitle = state.morse ? `${state.morse}${state.morseLoops ? " · Looping" : ""}` : "Idle";

  return (
    <List isLoading={loading} searchBarPlaceholder="Search lid light controls">
      <List.Section title="Light">
        <List.Item
          title="Lid Logo"
          icon={{ source: Icon.LightBulb, tintColor: lightOn ? Color.Yellow : Color.SecondaryText }}
          accessories={[{ text: state.setting ? onOff(lightOn) : "Unknown" }, { text: `Glow ${state.glow}%` }]}
          actions={<ActionPanel><Action title={lightOn ? "Turn Off" : "Turn On"} onAction={() => command({ operation: "toggle" })} /></ActionPanel>}
        />
        {state.direct && (
          <>
            <List.Item title="Brightness" icon={Icon.Sun} accessories={[{ text: brightness }]} actions={
              <ActionPanel>
                <Action.Push title="Set Brightness" icon={Icon.Sun} target={<BrightnessForm current={state.chosenBrightness} command={command} />} />
                {[25, 50, 75, 100].map((level) => (
                  <Action key={level} title={`Set Brightness to ${level}%`} onAction={() => command({ operation: "brightness", level })} />
                ))}
              </ActionPanel>
            } />
            <List.Item title="Effect" icon={Icon.Waveform} accessories={[{ text: effectTitle }]} actions={
              <ActionPanel>
                <Action.Push title="Choose Effect" icon={Icon.Waveform} target={<EffectList state={state} command={command} />} />
                {state.soundError && <Action.Open title="Open Audio Privacy Settings" target={audioSettings} />}
              </ActionPanel>
            } subtitle={state.soundError ? "Sound needs access to system audio" : undefined} />
            <List.Item title="Morse Code" icon={Icon.Text} accessories={[{ text: morseTitle }]} actions={
              <ActionPanel>
                {state.morse && <Action title="Stop Morse Code" icon={Icon.Stop} onAction={() => command({ operation: "stopMorse" })} />}
                <Action.Push title="Send Morse Code" icon={Icon.Play} target={<MorseForm state={state} command={command} />} />
              </ActionPanel>
            } />
          </>
        )}
      </List.Section>
      {state.direct && (
        <List.Section title="Power">
          <SwitchRow title="Battery Indicator" subtitle="Match brightness to battery charge" icon={Icon.Battery} enabled={state.battery} onChange={() => command({ operation: "battery" })} />
          <SwitchRow title="Charging Light" subtitle="Breathe while the battery charges" icon={Icon.Bolt} enabled={state.charging} onChange={() => command({ operation: "charging" })} />
          {state.lidAvailable && (
            <SwitchRow
              title="Lit with Lid Closed"
              subtitle={state.lidKeepsMacAwake ? "Keeping this Mac awake on power" : "Keeps this Mac awake on power when the lid is closed"}
              icon={Icon.Monitor}
              enabled={state.lid}
              onChange={() => command({ operation: "lid" })}
            />
          )}
        </List.Section>
      )}
      <List.Section title="Helper">
        <SwitchRow title="Launch at Login" icon={Icon.Clock} enabled={state.login} onChange={() => command({ operation: "login" })} />
        <List.Item title="Stop Helper" icon={Icon.Stop} subtitle="Stop effects and restore normal brightness" actions={
          <ActionPanel><Action title="Stop Helper" icon={Icon.Stop} onAction={() => command({ operation: "quit" })} /></ActionPanel>
        } />
      </List.Section>
    </List>
  );
}

function SwitchRow({ title, subtitle, icon, enabled, onChange }: {
  title: string;
  subtitle?: string;
  icon: Icon;
  enabled: boolean;
  onChange: () => Promise<boolean>;
}) {
  return (
    <List.Item
      title={title}
      subtitle={subtitle}
      icon={icon}
      accessories={[{ text: onOff(enabled) }]}
      actions={<ActionPanel><Action title={enabled ? "Turn Off" : "Turn On"} onAction={onChange} /></ActionPanel>}
    />
  );
}

function BrightnessForm({ current, command }: { current: number; command: Command }) {
  const [error, setError] = useState<string>();
  const { pop } = useNavigation();

  return (
    <Form navigationTitle="Set Brightness" actions={
      <ActionPanel><Action.SubmitForm title="Set Brightness" onSubmit={async ({ level }: { level: string }) => {
        const input = level.trim();
        const number = Number(input);
        if (!/^\d{1,3}$/.test(input) || number > 100) {
          setError("Enter a whole number between 0 and 100.");
          return;
        }
        setError(undefined);
        if (await command({ operation: "brightness", level: number })) pop();
      }} /></ActionPanel>
    }>
      <Form.TextField id="level" title="Brightness (%)" defaultValue={String(current)} error={error} onChange={() => setError(undefined)} />
    </Form>
  );
}

function EffectList({ state, command }: { state: State; command: Command }) {
  const { pop } = useNavigation();

  return (
    <List navigationTitle="Choose Lid Light Effect" searchBarPlaceholder="Filter effects">
      {(Object.entries(effects) as [Effect, string][]).filter(([effect]) => effect !== "sound" || state.soundAvailable).map(([effect, title]) => (
        <List.Item
          key={effect}
          title={title}
          icon={effect === "sound" ? Icon.SpeakerHigh : effect === "none" ? Icon.LightBulb : Icon.Waveform}
          accessories={state.effect === effect ? [{ icon: Icon.Check, tooltip: "Selected" }] : []}
          actions={<ActionPanel><Action title="Apply Effect" onAction={async () => {
            if (await command({ operation: "effect", effect })) pop();
          }} /></ActionPanel>}
        />
      ))}
    </List>
  );
}

function MorseForm({ state, command }: { state: State; command: Command }) {
  const { pop } = useNavigation();

  return (
    <Form navigationTitle="Send Morse Code" actions={
      <ActionPanel><Action.SubmitForm title="Play Morse Code" icon={Icon.Play} onSubmit={async ({ text, loops }: { text: string; loops: boolean }) => {
        if (await command({ operation: "morse", text, loops })) pop();
      }} /></ActionPanel>
    }>
      <Form.TextField id="text" title="Message" defaultValue={state.lastMorse} />
      <Form.Checkbox id="loops" label="Loop until stopped" defaultValue={state.morseLoops} />
    </Form>
  );
}
