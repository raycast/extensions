import { Icon, MenuBarExtra, launchCommand, LaunchType, open, openExtensionPreferences, showHUD } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  FanBarPreset,
  asFanBarError,
  formatCelsius,
  formatRPM,
  modeLabel,
  restoreLabel,
  runFanBar,
} from "./lib/fanbar";

// Background refreshes pass --no-launch, so the menu bar never reopens a
// FanBar you quit. Clicking a preset is an explicit request and may start it.
async function load() {
  const [statusReply, presetsReply] = await Promise.all([
    runFanBar(["status"], { noLaunch: true }),
    runFanBar(["preset", "list"], { noLaunch: true }),
  ]);
  return { status: statusReply.status, presets: presetsReply.presets ?? [] };
}

export default function MenuBar() {
  const { data, error, isLoading, revalidate } = usePromise(load, [], { onError: () => undefined });

  const status = data?.status;
  const cpu = status?.cpuCelsius;
  const failure = error ? asFanBarError(error) : undefined;
  const title = cpu !== undefined ? formatCelsius(cpu) : failure ? undefined : isLoading ? undefined : "—";

  async function run(args: string[], options: { hold?: boolean } = {}) {
    try {
      const reply = await runFanBar(args, options);
      await showHUD(reply.message);
    } catch (runError) {
      const runFailure = asFanBarError(runError);
      await showHUD(`${runFailure.title}: ${runFailure.message}`);
    }
    revalidate();
  }

  return (
    <MenuBarExtra
      icon={{ source: "extension-icon.png" }}
      title={title}
      tooltip={status ? `FanBar · ${modeLabel(status)}` : "FanBar"}
      isLoading={isLoading}
    >
      {failure && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title={failure.failure === "unreachable" ? "FanBar is not running" : failure.title}
            icon={Icon.Warning}
          />
          {failure.failure === "missing" ? (
            <MenuBarExtra.Item title="Set fanbar Path…" onAction={openExtensionPreferences} />
          ) : (
            <MenuBarExtra.Item title="Open FanBar" onAction={() => open("/Applications/FanBar.app")} />
          )}
        </MenuBarExtra.Section>
      )}
      {status && (
        <MenuBarExtra.Section title={modeLabel(status)}>
          {restoreLabel(status) && <MenuBarExtra.Item title={restoreLabel(status) ?? ""} />}
          {status.fans.map((fan) => (
            <MenuBarExtra.Item key={fan.index} title={`Fan ${fan.index + 1}: ${formatRPM(fan.currentRPM)}`} />
          ))}
          <MenuBarExtra.Item title={temperatureLine(status.cpuCelsius, status.gpuCelsius, status.ssdCelsius)} />
        </MenuBarExtra.Section>
      )}
      {data && data.presets.length > 0 && (
        <MenuBarExtra.Section title="Presets">
          {data.presets.map((preset) => (
            <PresetItem
              key={preset.id}
              preset={preset}
              active={status?.mode === "curve" && status.preset === preset.id}
              onRun={(hold) => run(["preset", "set", preset.id], { hold })}
            />
          ))}
        </MenuBarExtra.Section>
      )}
      {status && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Automatic (macOS)"
            icon={status.mode === "automatic" ? Icon.Checkmark : undefined}
            onAction={() => run(["mode", "auto"])}
          />
          <MenuBarExtra.Item
            title="Fixed RPM…"
            onAction={() => launchCommand({ name: "fixed-rpm", type: LaunchType.UserInitiated })}
          />
          <MenuBarExtra.Item
            title="Fan Status"
            onAction={() => launchCommand({ name: "fan-status", type: LaunchType.UserInitiated })}
          />
        </MenuBarExtra.Section>
      )}
    </MenuBarExtra>
  );
}

function PresetItem(props: { preset: FanBarPreset; active: boolean; onRun: (hold: boolean) => void }) {
  const { preset, active } = props;
  return (
    <MenuBarExtra.Item
      title={preset.name}
      icon={active ? Icon.Checkmark : undefined}
      tooltip="Hold ⌥ to keep it until changed"
      onAction={() => props.onRun(false)}
      alternate={<MenuBarExtra.Item title={`${preset.name} Until Changed`} onAction={() => props.onRun(true)} />}
    />
  );
}

function temperatureLine(...values: (number | undefined)[]): string {
  const labels = ["CPU", "GPU", "SSD"];
  const parts = values.flatMap((value, index) =>
    value === undefined ? [] : [`${labels[index]} ${formatCelsius(value)}`],
  );
  return parts.length > 0 ? parts.join(" · ") : "No temperature readings yet";
}
