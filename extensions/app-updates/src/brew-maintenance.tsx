import {
  Color,
  getPreferenceValues,
  Icon,
  LaunchType,
  MenuBarExtra,
  openCommandPreferences,
  Clipboard,
  launchCommand,
  showHUD,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  runBrewMaintenance,
  type BrewMaintenanceOptions,
  type BrewReport,
  type DoctorWarning,
} from "./utils/brew-maintenance";

function getOptions(): BrewMaintenanceOptions {
  const prefs = getPreferenceValues<Preferences.BrewMaintenance>();

  return {
    runUpdate: prefs.brewRunUpdate ?? true,
    runUpgradeFormulae: prefs.brewUpgradeFormulae ?? true,
    runUpgradeCasks: prefs.brewUpgradeCasks ?? false,
    runDoctor: prefs.brewRunDoctor ?? true,
    runCleanup: prefs.brewRunCleanup ?? false,
  };
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

function extractFixCommand(warning: DoctorWarning): string | null {
  // Extract commands from warning details (lines starting with backtick-wrapped commands or indented commands)
  const cmdMatch = warning.details.match(/`([^`]+)`/);
  if (cmdMatch) return cmdMatch[1];

  // Look for "Run X" or "Untap them with X" patterns in title + details
  const fullText = warning.title + " " + warning.details;
  const runMatch = fullText.match(/(?:Run|run|Untap them with) `([^`]+)`/);
  if (runMatch) return runMatch[1];

  return null;
}

export default function Command() {
  const [report, setReport] = useCachedState<BrewReport | null>("brew-maintenance-report", null);
  const [isLoading, setIsLoading] = useState(true);
  const [stepName, setStepName] = useState("Starting...");

  function run() {
    setIsLoading(true);
    const options = getOptions();
    options.onStep = (name) => setStepName(name);

    runBrewMaintenance(options)
      .then((r) => setReport(r))
      .catch((err) => console.error("[BrewMaintenance] Failed:", err))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    run();
  }, []);

  const hasWarnings = (report?.doctorWarnings.length ?? 0) > 0;
  const hasFailures = report?.steps.some((s) => !s.success) ?? false;
  const totalUpgraded = (report?.updatedFormulae.length ?? 0) + (report?.updatedCasks.length ?? 0);

  let icon: MenuBarExtra.Props["icon"];
  let title: string | undefined;

  if (isLoading && !report) {
    icon = Icon.Hammer;
    title = "...";
  } else if (hasFailures) {
    icon = { source: Icon.Hammer, tintColor: Color.Red };
  } else if (hasWarnings) {
    icon = { source: Icon.Hammer, tintColor: Color.Yellow };
  } else {
    icon = { source: Icon.Hammer, tintColor: Color.Green };
  }

  const tooltip =
    isLoading && !report
      ? stepName
      : hasFailures
        ? "Brew maintenance had errors"
        : totalUpgraded > 0
          ? `${totalUpgraded} package(s) upgraded`
          : "Homebrew is up to date";

  return (
    <MenuBarExtra icon={icon} title={title} tooltip={tooltip} isLoading={isLoading}>
      {isLoading && !report && <MenuBarExtra.Item title={stepName} icon={Icon.Clock} />}

      {report && (
        <>
          <MenuBarExtra.Section title={`Last run: ${new Date(report.ranAt).toLocaleString()}`}>
            <MenuBarExtra.Item title={`Total time: ${formatDuration(report.totalDuration)}`} icon={Icon.Stopwatch} />
          </MenuBarExtra.Section>

          <MenuBarExtra.Section title="Steps">
            {report.steps.map((step) => (
              <MenuBarExtra.Item
                key={step.name}
                title={step.name}
                subtitle={formatDuration(step.duration)}
                icon={
                  step.success
                    ? { source: Icon.Check, tintColor: Color.Green }
                    : { source: Icon.Xmark, tintColor: Color.Red }
                }
              />
            ))}
          </MenuBarExtra.Section>

          {(report.updatedFormulae.length > 0 || report.updatedCasks.length > 0) && (
            <MenuBarExtra.Section title="Upgraded">
              {report.updatedFormulae.map((f) => (
                <MenuBarExtra.Item key={`f-${f}`} title={f} icon={Icon.Box} />
              ))}
              {report.updatedCasks.map((c) => (
                <MenuBarExtra.Item key={`c-${c}`} title={c} icon={Icon.AppWindow} subtitle="cask" />
              ))}
            </MenuBarExtra.Section>
          )}

          {totalUpgraded === 0 && !hasFailures && (
            <MenuBarExtra.Section>
              <MenuBarExtra.Item title="Everything is up to date" icon={Icon.CheckCircle} />
            </MenuBarExtra.Section>
          )}

          {report.doctorWarnings.length > 0 && (
            <MenuBarExtra.Section title={`Doctor Warnings (${report.doctorWarnings.length})`}>
              {report.doctorWarnings.map((w, i) => {
                const fixCmd = extractFixCommand(w);
                return (
                  <MenuBarExtra.Item
                    key={`w-${w.title}-${i}`}
                    title={w.title}
                    icon={{ source: Icon.ExclamationMark, tintColor: Color.Yellow }}
                    tooltip={w.details || undefined}
                    onAction={
                      fixCmd
                        ? async () => {
                            await Clipboard.copy(fixCmd);
                            await showHUD(`Copied: ${fixCmd}`);
                          }
                        : undefined
                    }
                  />
                );
              })}
            </MenuBarExtra.Section>
          )}
        </>
      )}

      <MenuBarExtra.Separator />

      {hasWarnings && (
        <MenuBarExtra.Item
          title="Get AI Advice"
          icon={Icon.Stars}
          shortcut={{ modifiers: ["cmd"], key: "a" }}
          onAction={() => launchCommand({ name: "doctor-advice", type: LaunchType.UserInitiated })}
        />
      )}
      <MenuBarExtra.Item
        title="Run Now"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={() => run()}
      />
      <MenuBarExtra.Item
        title="Preferences..."
        icon={Icon.Gear}
        shortcut={{ modifiers: ["cmd"], key: "," }}
        onAction={() => openCommandPreferences()}
      />
    </MenuBarExtra>
  );
}
