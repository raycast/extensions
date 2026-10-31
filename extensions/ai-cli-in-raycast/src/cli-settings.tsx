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
  openExtensionPreferences,
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
import { ModelSettings } from "./model-settings";

function statusText(result?: CliDetectionResult) {
  if (!result) return t("Checking…");
  if (result.status === "found") return t("Found");
  if (result.status === "manual-required") return t("Path required");
  return result.source === "manual"
    ? t("Check configured path")
    : t("Not found");
}

export function CliSettingsView() {
  const preferences = getPreferenceValues<Preferences>();
  setLanguage(preferences.uiLanguage);
  const [results, setResults] = useState<Record<string, CliDetectionResult>>(
    {},
  );
  const [checking, setChecking] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [refreshId, setRefreshId] = useState(0);
  const launchPending = useRef(false);
  const mountedRef = useRef(true);
  const controller = useRef(new CliDetectionController());
  useEffect(() => {
    mountedRef.current = true;
    void updateCommandMetadata({ subtitle: t("CLI Settings") }).catch(() => {});
    return () => {
      mountedRef.current = false;
    };
  }, []);
  useEffect(() => {
    let mounted = true;
    setChecking(true);
    setResults({});
    void controller.current
      .scan(getPreferenceValues<Preferences>(), (result) => {
        if (mounted)
          setResults((current) => ({ ...current, [result.provider]: result }));
      })
      .catch(() => {
        if (mounted)
          void showToast({
            style: Toast.Style.Failure,
            title: t("Could Not Detect CLIs"),
          });
      })
      .finally(() => {
        if (mounted) setChecking(false);
      });
    return () => {
      mounted = false;
      controller.current.cancel();
    };
  }, [refreshId]);

  async function openCommand(name: string) {
    if (!mountedRef.current || launchPending.current) return;
    launchPending.current = true;
    setLaunching(true);
    try {
      await launchCommand({ name, type: LaunchType.UserInitiated });
    } catch (reason) {
      if (mountedRef.current)
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
      if (mountedRef.current) setLaunching(false);
    }
  }

  const preferencesAction = (
    <Action
      title={t("Language and CLI Preferences")}
      icon={Icon.Gear}
      onAction={openExtensionPreferences}
    />
  );
  const refreshAction = (
    <Action
      title={t("Detect CLIs Again")}
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={() => setRefreshId((current) => current + 1)}
    />
  );
  return (
    <List
      navigationTitle={t("AI CLI in Raycast Settings")}
      searchBarPlaceholder={t("Find a CLI or setting…")}
      isLoading={checking || launching}
      isShowingDetail
    >
      <List.Section title={t("Local AI CLI")}>
        {CLI_DEFINITIONS.map((entry) => {
          const result = results[entry.id];
          const found = result?.status === "found";
          const source =
            result?.status === "manual-required"
              ? ""
              : result?.source === "manual"
                ? t("Custom path")
                : t("Automatic detection");
          const description = found
            ? t("A CLI was found. Sign-in is checked when you send a message.")
            : result?.status === "manual-required"
              ? t("Set a CLI path in preferences, then refresh.")
              : result
                ? t("No CLI was found. Set a path or install the CLI.")
                : t("Checking installation paths…");
          return (
            <List.Item
              key={entry.id}
              id={entry.id}
              title={entry.label}
              icon={`provider-${entry.id === "qoder-cn" ? "qoder" : entry.id}.png`}
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
                },
              ]}
              keywords={[entry.id, "cli", entry.preference]}
              detail={
                <List.Item.Detail
                  markdown={`### ${entry.label}\n\n${description}`}
                  metadata={
                    result ? (
                      <List.Item.Detail.Metadata>
                        {source && (
                          <List.Item.Detail.Metadata.Label
                            title={t("Source")}
                            text={source}
                          />
                        )}
                        {result.path && (
                          <List.Item.Detail.Metadata.Label
                            title={t("CLI Path")}
                            text={result.path}
                          />
                        )}
                        {result.runtime && (
                          <List.Item.Detail.Metadata.Label
                            title={t("Node.js Runtime")}
                            text={result.runtime}
                          />
                        )}
                        {result.configuredPath &&
                          result.configuredPath.replace(/\\/g, "/") !==
                            result.path?.replace(/\\/g, "/") && (
                            <List.Item.Detail.Metadata.Label
                              title={t("Configured Path")}
                              text={result.configuredPath}
                            />
                          )}
                        {result.error && (
                          <List.Item.Detail.Metadata.Label
                            title={t("Detection Details")}
                            text={result.error}
                          />
                        )}
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title={t("Checked")}
                          text={new Date(result.checkedAt).toLocaleString()}
                        />
                      </List.Item.Detail.Metadata>
                    ) : undefined
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title={t("Open {provider}", { provider: entry.label })}
                    icon={Icon.ArrowRight}
                    onAction={() => openCommand(PROVIDER_COMMANDS[entry.id])}
                  />
                  <Action.Push
                    title={t("Model and Effort Defaults")}
                    icon={Icon.ComputerChip}
                    target={<ModelSettings provider={entry.id} />}
                  />
                  {preferencesAction}
                  {result?.path && (
                    <Action.CopyToClipboard
                      title={t("Copy CLI Path")}
                      content={result.path}
                    />
                  )}
                  {refreshAction}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      <List.Section title={t("Preferences")}>
        <List.Item
          id="preferences"
          title={t("Preferences")}
          icon={Icon.Gear}
          detail={
            <List.Item.Detail
              markdown={[
                `### ${t("Preferences")}`,
                t("Set language, CLI detection, paths, and permissions."),
                t(
                  "Enable or disable commands in Raycast Settings → Extensions.",
                ),
              ].join("\n\n")}
            />
          }
          actions={
            <ActionPanel>
              {preferencesAction}
              {refreshAction}
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

export default CliSettingsView;
