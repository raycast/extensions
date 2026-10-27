import { Action, ActionPanel, Color, Form, Icon, List, showHUD, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { AppModePrimary, AppModeSection } from "./components/app-mode-actions";
import { AppPicker } from "./components/app-picker";
import * as api from "./lib/api";
import { frontmostApp } from "./lib/context";
import { openSettings, revealAppRule } from "./lib/navigation";
import { keyKindLabel, modeColor, modeDescription, modeLabel } from "./lib/presentation";
import { confirmDestructive, reportFailure } from "./lib/toast";
import type {
  AppRule,
  AppResolution,
  AppRoutingMode,
  AppRuleKeyKind,
  AppsSnapshot,
} from "./lib/types";
import type { AppContext } from "./lib/context";

const MODES: AppRoutingMode[] = ["TUNNEL", "TARGETS", "DIRECT"];

type RuleValues = { key: string; keyKind: AppRuleKeyKind; mode: AppRoutingMode };

interface Loaded {
  apps: AppsSnapshot;
  app: AppContext | null;
  resolution: AppResolution | null;
}

/**
 * Per-app rules are a separate command because they answer a different question
 * ("which apps ignore the target list?"). The frontmost app leads, so the common
 * case — "route the app I was just in" — is one keystroke.
 */
export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(load, [], {
    failureToastOptions: { title: "Couldn't load app routing" },
  });
  const { pop } = useNavigation();

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      await revalidate();
      await showHUD(success);
    } catch (error) {
      await reportFailure(error, "Proxy Manager refused the change");
    }
  }

  async function removeRule(rule: AppRule) {
    const confirmed = await confirmDestructive({
      title: `Remove the rule for ${rule.key}?`,
      message: "The app follows the default mode again.",
      actionTitle: "Remove Rule",
    });
    if (!confirmed) return;
    await run(() => api.removeAppRule({ id: rule.id }), `Removed ${rule.key}`);
  }

  if (!data) {
    return <List isLoading={isLoading} />;
  }

  const { apps } = data;
  const frontmost =
    data.app && data.resolution
      ? {
          name: data.app.name,
          bundleId: data.app.bundleId,
          mode: data.resolution.mode,
          ruleId: data.resolution.ruleID,
          appsEnabled: apps.enabled,
        }
      : null;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search app rules…"
      navigationTitle="App Routing"
    >
      {frontmost ? (
        <List.Section title="This App">
          <List.Item
            id="frontmost-app"
            icon={{ source: Icon.AppWindow, tintColor: Color.PrimaryText }}
            title={frontmost.name}
            subtitle={frontmost.bundleId}
            accessories={[
              {
                tag: {
                  value: modeLabel(frontmost.mode),
                  color: modeColor(frontmost.mode),
                },
              },
              ...(frontmost.ruleId
                ? []
                : [{ tag: { value: "No rule", color: Color.SecondaryText } }]),
            ]}
            actions={
              <ActionPanel>
                <AppModePrimary app={frontmost} onDone={revalidate} />
                <AppModeSection app={frontmost} onDone={revalidate} />
                <ActionPanel.Section>
                  <Action
                    title="Reveal in Proxy Manager"
                    icon={Icon.AppWindow}
                    shortcut={{ modifiers: ["cmd"], key: "l" }}
                    onAction={() => openSettings("apps")}
                  />
                  <Action.CopyToClipboard
                    title="Copy Bundle Identifier"
                    content={frontmost.bundleId}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}

      <List.Section title="Per-App Routing">
        <List.Item
          id="apps-enabled"
          icon={
            apps.enabled
              ? { source: Icon.CheckCircle, tintColor: Color.Green }
              : { source: Icon.Circle, tintColor: Color.SecondaryText }
          }
          title={apps.enabled ? "Per-app routing is on" : "Per-app routing is off"}
          subtitle={
            apps.enabled
              ? "A matching rule wins over the target list"
              : "Every app follows the target list"
          }
          accessories={[
            { text: `${apps.rules.length} ${apps.rules.length === 1 ? "rule" : "rules"}` },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action
                  title={apps.enabled ? "Turn off App Routing" : "Turn on App Routing"}
                  icon={apps.enabled ? Icon.Circle : Icon.Play}
                  onAction={() =>
                    run(
                      () => api.setAppsEnabled(!apps.enabled),
                      apps.enabled ? "Per-app routing off" : "Per-app routing on",
                    )
                  }
                />
                <Action.Push
                  title="Add App Rule…"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={
                    <AppPicker
                      appsEnabled={apps.enabled}
                      frontmostBundleId={data.app?.bundleId}
                      onDone={revalidate}
                    />
                  }
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Reveal in Proxy Manager"
                  icon={Icon.AppWindow}
                  shortcut={{ modifiers: ["cmd"], key: "l" }}
                  onAction={() => openSettings("apps")}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => revalidate()}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />

        <List.Item
          id="default-mode"
          icon={{ source: Icon.Switch, tintColor: Color.Blue }}
          title="Default for unlisted apps"
          subtitle={modeDescription(apps.defaultMode)}
          accessories={[{ tag: { value: modeLabel(apps.defaultMode) } }]}
          actions={
            <ActionPanel>
              <DefaultModeSubmenu current={apps.defaultMode} run={run} />
              <Action
                title="Reveal in Proxy Manager"
                icon={Icon.AppWindow}
                onAction={() => openSettings("apps")}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section
        title="Rules"
        subtitle={apps.rules.length > 0 ? `${apps.rules.length}` : undefined}
      >
        {apps.rules.map((rule) => (
          <List.Item
            key={rule.id}
            id={rule.id}
            icon={
              rule.enabled
                ? { source: Icon.AppWindow, tintColor: Color.PrimaryText }
                : { source: Icon.CircleDisabled, tintColor: Color.SecondaryText }
            }
            title={rule.key}
            subtitle={keyKindLabel(rule.keyKind)}
            accessories={[
              { tag: { value: modeLabel(rule.mode), color: modeColor(rule.mode) } },
              ...(rule.enabled ? [] : [{ tag: { value: "Off", color: Color.SecondaryText } }]),
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <ActionPanel.Submenu title="Change Mode…" icon={Icon.Switch}>
                    {MODES.map((mode) => (
                      <Action
                        key={mode}
                        title={modeLabel(mode)}
                        onAction={() =>
                          run(
                            () =>
                              api.setAppRule({
                                key: rule.key,
                                keyKind: rule.keyKind,
                                mode,
                                enabled: rule.enabled,
                              }),
                            `${rule.key}: ${modeLabel(mode)}`,
                          )
                        }
                      />
                    ))}
                  </ActionPanel.Submenu>
                  <Action
                    title={rule.enabled ? "Disable Rule" : "Enable Rule"}
                    icon={rule.enabled ? Icon.CircleDisabled : Icon.CheckCircle}
                    onAction={() =>
                      run(
                        () =>
                          api.setAppRule({
                            key: rule.key,
                            keyKind: rule.keyKind,
                            mode: rule.mode,
                            enabled: !rule.enabled,
                          }),
                        rule.enabled ? `Disabled ${rule.key}` : `Enabled ${rule.key}`,
                      )
                    }
                  />
                  <Action
                    title="Remove Rule"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => removeRule(rule)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Reveal in Proxy Manager"
                    icon={Icon.AppWindow}
                    onAction={() => revealAppRule(rule.id)}
                  />
                  <Action.CopyToClipboard title="Copy Key" content={rule.key} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}

        {apps.rules.length === 0 ? (
          <List.Item
            id="no-rules"
            icon={{ source: Icon.Info, tintColor: Color.SecondaryText }}
            title="No app rules yet"
            subtitle={
              apps.enabled
                ? "Every app follows the default mode"
                : "Turn per-app routing on to make rules apply"
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title="Add App Rule…"
                  icon={Icon.Plus}
                  target={
                    <AppPicker
                      appsEnabled={apps.enabled}
                      frontmostBundleId={data.app?.bundleId}
                      onDone={revalidate}
                    />
                  }
                />
                <Action.Push
                  title="Add by Path or Name…"
                  icon={Icon.Pencil}
                  target={
                    <AppRuleForm
                      onSaved={async () => {
                        pop();
                        await revalidate();
                      }}
                    />
                  }
                />
              </ActionPanel>
            }
          />
        ) : null}
      </List.Section>
    </List>
  );
}

async function load(): Promise<Loaded> {
  const [apps, app] = await Promise.all([api.getApps(), frontmostApp()]);
  let resolution: AppResolution | null = null;
  if (app) {
    resolution = await api.resolveApp({ bundleID: app.bundleId }).catch(() => null);
  }
  return { apps, app, resolution };
}

function DefaultModeSubmenu({
  current,
  run,
}: {
  current: AppRoutingMode;
  run: (action: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  return (
    <ActionPanel.Submenu title="Set Default Mode…" icon={Icon.Switch}>
      {MODES.map((mode) => (
        <Action
          key={mode}
          title={modeLabel(mode)}
          icon={mode === current ? Icon.CheckCircle : Icon.Circle}
          onAction={() =>
            run(() => api.setAppsDefaultMode(mode), `Undefined apps: ${modeLabel(mode)}`)
          }
        />
      ))}
    </ActionPanel.Submenu>
  );
}

function AppRuleForm({ onSaved }: { onSaved: () => void | Promise<void> }) {
  const [key, setKey] = useState("");
  const [keyKind, setKeyKind] = useState<AppRuleKeyKind>("BUNDLE");
  const [mode, setMode] = useState<AppRoutingMode>("TUNNEL");
  const [error, setError] = useState<string | undefined>(undefined);

  return (
    <Form
      navigationTitle="Add App Rule"
      actions={
        <ActionPanel>
          <Action.SubmitForm<RuleValues>
            title="Add Rule"
            icon={Icon.Plus}
            onSubmit={async (values) => {
              const trimmed = values.key.trim();
              if (!trimmed) {
                setError("Enter a bundle ID, a path or an executable name");
                return;
              }
              try {
                await api.setAppRule({
                  key: trimmed,
                  keyKind: values.keyKind,
                  mode: values.mode,
                });
                await showHUD(`${trimmed}: ${modeLabel(values.mode)}`);
                await onSaved();
              } catch (submitError) {
                await reportFailure(submitError, "Couldn't save the rule");
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="key"
        title="App"
        placeholder="com.tinyspeck.slackmacgap"
        value={key}
        error={error}
        onChange={(next) => {
          setKey(next);
          setError(undefined);
        }}
      />
      <Form.Dropdown
        id="keyKind"
        title="Match By"
        value={keyKind}
        onChange={(next) => setKeyKind(next as AppRuleKeyKind)}
      >
        <Form.Dropdown.Item value="BUNDLE" title="Bundle ID" />
        <Form.Dropdown.Item value="EXECUTABLE" title="Executable path" />
        <Form.Dropdown.Item value="EXECUTABLE_NAME" title="Executable name" />
      </Form.Dropdown>
      <Form.Dropdown
        id="mode"
        title="Mode"
        value={mode}
        onChange={(next) => setMode(next as AppRoutingMode)}
      >
        {MODES.map((candidate) => (
          <Form.Dropdown.Item key={candidate} value={candidate} title={modeLabel(candidate)} />
        ))}
      </Form.Dropdown>
      <Form.Description
        text={
          "Use this only for an executable path or name. The app picker covers ordinary apps, whose rules match on the bundle ID."
        }
      />
    </Form>
  );
}
