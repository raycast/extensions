import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  List,
  type LaunchProps,
  showToast,
  Toast,
  updateCommandMetadata,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import {
  CLI_DEFINITIONS,
  CliDetectionController,
  type CliDetectionResult,
} from "./cli-detection";
import { PROVIDER_COMMANDS } from "./command-routing";
import { messageOf } from "./conversations";
import { setLanguage, t } from "./i18n";
import { CliSettingsView } from "./cli-settings";

function statusText(result?: CliDetectionResult) {
  if (!result) return t("Checking…");
  if (result.status === "found") return t("Found");
  if (result.status === "manual-required") return t("Path required");
  return result.source === "manual"
    ? t("Check configured path")
    : t("Not found");
}

export default function CliHub(props?: LaunchProps) {
  if (props?.launchContext?.view === "cli-settings") return <CliSettingsView />;
  const preferences = getPreferenceValues<Preferences>();
  setLanguage(preferences.uiLanguage);
  const [results, setResults] = useState<Record<string, CliDetectionResult>>(
    {},
  );
  const [checking, setChecking] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [refreshId, setRefreshId] = useState(0);
  const launchPending = useRef(false);
  const mounted = useRef(true);
  const controller = useRef(new CliDetectionController());
  useEffect(() => {
    mounted.current = true;
    void updateCommandMetadata({ subtitle: t("Local AI CLIs") }).catch(
      () => {},
    );
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    let current = true;
    setChecking(true);
    setResults({});
    void controller.current
      .scan(getPreferenceValues<Preferences>(), (result) => {
        if (current)
          setResults((existing) => ({
            ...existing,
            [result.provider]: result,
          }));
      })
      .catch(() => {
        if (current)
          void showToast({
            style: Toast.Style.Failure,
            title: t("Could Not Detect CLIs"),
          });
      })
      .finally(() => {
        if (current) setChecking(false);
      });
    return () => {
      current = false;
      controller.current.cancel();
    };
  }, [refreshId]);

  async function openCommand(name: string) {
    if (launchPending.current) return;
    launchPending.current = true;
    setLaunching(true);
    try {
      // Raycast handles each command's enabled state. No prompt, session, or
      // model state is forwarded between independent CLI commands.
      await launchCommand({ name, type: LaunchType.UserInitiated });
    } catch (reason) {
      if (mounted.current)
        await showToast({
          style: Toast.Style.Failure,
          title: t("Could Not Open Command"),
          message: /disabled|no enabled command/i.test(messageOf(reason))
            ? t(
                "Enable this command in Raycast Settings → Extensions, then try again.",
              )
            : messageOf(reason),
        });
    } finally {
      launchPending.current = false;
      if (mounted.current) setLaunching(false);
    }
  }

  return (
    <List
      navigationTitle="AI CLI in Raycast"
      searchBarPlaceholder={t("Choose a CLI…")}
      isLoading={checking || launching}
    >
      {CLI_DEFINITIONS.map((entry) => {
        const result = results[entry.id];
        const found = result?.status === "found";
        return (
          <List.Item
            key={entry.id}
            id={entry.id}
            title={`${entry.label} in Raycast`}
            icon={`provider-${entry.id === "qoder-cn" ? "qoder" : entry.id}.png`}
            keywords={[entry.id, "cli", entry.label]}
            accessories={[
              {
                tag: {
                  value: statusText(result),
                  color: found
                    ? Color.Green
                    : result
                      ? Color.Orange
                      : Color.SecondaryText,
                },
                tooltip: t(
                  "Detection checks installation paths. Sign-in and model access are confirmed when you send a message.",
                ),
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title={t("Open {provider}", { provider: entry.label })}
                  icon={Icon.ArrowRight}
                  onAction={() => openCommand(PROVIDER_COMMANDS[entry.id])}
                />
                <Action.Push
                  title={t("Open CLI Settings")}
                  icon={Icon.Gear}
                  target={<CliSettingsView />}
                />
                <Action
                  title={t("Detect CLIs Again")}
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={() => setRefreshId((current) => current + 1)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
