import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Detail,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import path from "node:path";
import {
  isLocalActivation,
  isLinkableSettingsGroup,
  linkSettingsGroup,
  mirrorPlanFromScan,
  removeTargetSetting,
  scanEnabledCssSnippets,
  scanSettingChoices,
  SETTING_FILES,
  syncSettingChoices,
  type SettingChoice,
  type SettingFile,
  type ActivationEntry,
} from "./lib/core-settings";
import { activationOverlapVisual, hotkeyChoiceVisual, settingsGroupVisual } from "./lib/inspector-visuals";
import { hotkeySummary } from "./lib/hotkey-display";
import { detachItem, scanItems, type VaultItem } from "./lib/items";
import ItemInspector from "./inspector";
import { useVaultRefresh } from "./lib/use-vault-refresh";

type Changed = () => Promise<unknown> | void;

interface ActivationGroup {
  id: string;
  title: string;
  file: SettingFile;
  entries: ActivationEntry[];
  shared: boolean;
  problem?: string;
  visualPath?: string;
}

function activationMarkdown(group: ActivationGroup): string {
  if (group.problem) return `# Could not read ${group.title}\n\n${group.problem}`;
  if (!group.visualPath) return `# ${group.title}\n\nCould not render the activation view.`;
  return `![${group.title} activation overlap](<${group.visualPath}>)`;
}

function ActivationIds({ group, targetVault }: { group: ActivationGroup; targetVault: string }) {
  const state = (value: string, present: boolean) =>
    group.file === "core-plugins.json" && !present ? "Not set" : value === "Enabled" ? "On" : "Off";
  return (
    <List
      navigationTitle={`${group.title} IDs · ${path.basename(targetVault)}`}
      searchBarPlaceholder="Search activation IDs..."
    >
      {group.entries.length === 0 ? (
        <List.EmptyView title="No activation IDs" description="Neither vault has entries in this activation list." />
      ) : (
        <List.Section title={group.title} subtitle={`${group.entries.length} IDs`}>
          {group.entries.map((entry) => (
            <List.Item
              key={entry.name}
              title={entry.name}
              subtitle={`Default: ${state(entry.defaultValue, entry.inDefault)} · This vault: ${state(entry.targetValue, entry.inTarget)}`}
              icon={entry.targetValue === "Enabled" ? Icon.CheckCircle : Icon.Circle}
              accessories={[
                {
                  tag: {
                    value: entry.different ? "DIFFERENT" : "MATCHING",
                    color: entry.different ? Color.Orange : Color.Green,
                  },
                },
              ]}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function ActivationOverview({ group, targetVault }: { group: ActivationGroup; targetVault: string }) {
  const { push } = useNavigation();
  return (
    <Detail
      navigationTitle={`${group.title} · ${path.basename(targetVault)}`}
      markdown={activationMarkdown(group)}
      actions={
        <ActionPanel>
          <Action
            title="Browse Activation IDs"
            icon={Icon.List}
            onAction={() => push(<ActivationIds group={group} targetVault={targetVault} />)}
          />
        </ActionPanel>
      }
    />
  );
}

function sharedChoices(choices: SettingChoice[], file: SettingFile): SettingChoice[] {
  return choices
    .filter((choice) => choice.file === file)
    .map((choice) => ({
      ...choice,
      targetValue: choice.defaultValue,
      targetHotkeys: choice.defaultHotkeys,
      inTarget: choice.inDefault,
      targetFileExists: choice.defaultFileExists,
      targetHash: choice.defaultHash,
      different: false,
    }));
}

function groupPreview(title: string, preview?: { path?: string; error?: string }): string {
  if (preview?.path) return `![${title} settings comparison](<${preview.path}>)`;
  return `# ${title}\n\n${preview?.error ? `Could not render the settings preview: ${preview.error}` : "Loading settings preview…"}`;
}

function SettingsGroup({
  file,
  title,
  defaultVault,
  targetVault,
  onChanged,
}: {
  file: SettingFile;
  title: string;
  defaultVault: string;
  targetVault: string;
  onChanged?: Changed;
}) {
  const { data, isLoading, error, revalidate } = usePromise(
    async (origin: string, target: string) => {
      const [settings, source, items] = await Promise.all([
        scanSettingChoices(origin, target),
        scanSettingChoices(origin),
        scanItems(origin, target),
      ]);
      const linked = items.some(
        (item) => item.category === "settings" && item.name === file && item.state === "linked",
      );
      const hotkeyVisuals: Record<string, string> = {};
      if (file === "hotkeys.json") {
        const choices = linked
          ? sharedChoices(source.choices, file)
          : settings.choices.filter((choice) => choice.file === file);
        await Promise.all(
          choices.map(async (choice) => {
            try {
              hotkeyVisuals[choice.id] = await hotkeyChoiceVisual(choice, linked, origin, target);
            } catch {
              // Keep the shortcut readable in the list if its image cannot be written.
            }
          }),
        );
      }
      return {
        settings,
        source,
        linked,
        hotkeyVisuals,
      };
    },
    [defaultVault, targetVault],
  );
  useVaultRefresh(defaultVault, targetVault, () => void revalidate());
  const entries = data?.linked
    ? sharedChoices(data.source.choices, file)
    : (data?.settings.choices ?? []).filter((choice) => choice.file === file);
  const problem = data?.linked
    ? data.source.problems.find((entry) => entry.file === file)
    : data?.settings.problems.find((entry) => entry.file === file);

  async function remove(choice: SettingChoice) {
    const confirmed = await confirmAlert({
      title: `Remove ${choice.label} from this vault?`,
      message: `This removes only the ${choice.name} key from this vault's ${choice.file}. Obsidian will use its own default. The Default Vault stays unchanged, and a backup of this vault's file will be kept.`,
      primaryAction: { title: "Remove Setting", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      const backup = await removeTargetSetting(defaultVault, targetVault, choice);
      await Promise.all([revalidate(), onChanged?.()]);
      await showToast({
        style: Toast.Style.Success,
        title: `Removed ${choice.label} from this vault`,
        message: `Previous file saved at ${backup}`,
      });
    } catch (failure) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not remove setting",
        message: String(failure),
      });
    }
  }

  async function apply(choice: SettingChoice, from: "default" | "target") {
    const source = from === "default" ? "Default Vault" : path.basename(targetVault);
    const destination = from === "default" ? path.basename(targetVault) : "Default Vault";
    const defaultValue =
      file === "hotkeys.json" ? hotkeySummary(choice.defaultHotkeys, choice.inDefault) : choice.defaultValue;
    const targetValue =
      file === "hotkeys.json" ? hotkeySummary(choice.targetHotkeys, choice.inTarget) : choice.targetValue;
    const confirmed = await confirmAlert({
      title: `Use ${source}'s ${choice.label}?`,
      message: `${source}: ${from === "default" ? defaultValue : targetValue}\n${destination}: ${from === "default" ? targetValue : defaultValue}\n\nOnly this setting will change. A backup of the destination file will be kept.`,
      primaryAction: { title: `Apply to ${destination}`, style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      const result = await syncSettingChoices(defaultVault, targetVault, [choice.id], from, {
        [choice.file]: { defaultHash: choice.defaultHash, targetHash: choice.targetHash },
      });
      await Promise.all([revalidate(), onChanged?.()]);
      await showToast({
        style: Toast.Style.Success,
        title: `Updated ${choice.label}`,
        message:
          result.historyWarnings[0] ??
          (result.backups[0] ? `Previous file saved at ${result.backups[0]}` : "Setting added"),
      });
    } catch (failure) {
      await showToast({ style: Toast.Style.Failure, title: "Could not update setting", message: String(failure) });
      void revalidate();
    }
  }

  return (
    <List
      navigationTitle={`${title} · ${path.basename(targetVault)}`}
      searchBarPlaceholder={`Search ${title.toLowerCase()} settings...`}
      isLoading={isLoading}
      isShowingDetail={file === "hotkeys.json"}
    >
      {error ? (
        <List.EmptyView title="Could not read settings" description={String(error)} icon={Icon.ExclamationMark} />
      ) : problem ? (
        <List.EmptyView title={`Could not read ${title}`} description={problem.message} icon={Icon.ExclamationMark} />
      ) : entries.length === 0 ? (
        <List.EmptyView title="No individual settings" description="This group has no settings to show here." />
      ) : (
        <List.Section title={title} subtitle={`${entries.filter((choice) => choice.different).length} different`}>
          {entries.map((choice) => {
            const local = !data?.linked && isLocalActivation(choice.file, choice.name);
            return (
              <List.Item
                key={choice.id}
                title={choice.label}
                subtitle={
                  file === "hotkeys.json"
                    ? hotkeySummary(choice.targetHotkeys, choice.inTarget)
                    : choice.different
                      ? `${choice.defaultValue} → ${choice.targetValue}`
                      : choice.defaultValue
                }
                icon={choice.different ? Icon.Circle : Icon.CheckCircle}
                detail={
                  file === "hotkeys.json" ? (
                    <List.Item.Detail
                      markdown={
                        data?.hotkeyVisuals[choice.id]
                          ? `![Shortcut comparison](<${data.hotkeyVisuals[choice.id]}>)`
                          : "Shortcut preview unavailable. The row shows this vault's shortcut."
                      }
                    />
                  ) : undefined
                }
                accessories={[
                  {
                    tag: {
                      value: local ? "LOCAL" : choice.different ? "DIFFERENT" : "MATCHING",
                      color: local ? Color.Purple : choice.different ? Color.Orange : Color.Green,
                    },
                  },
                ]}
                actions={
                  <ActionPanel>
                    {!local && !data?.linked && choice.inTarget && (
                      <Action title="Remove from This Vault" icon={Icon.Circle} onAction={() => void remove(choice)} />
                    )}
                    {!local && choice.different && choice.defaultFileExists && (
                      <Action
                        title="Use Default Value in This Vault"
                        icon={Icon.ArrowRight}
                        onAction={() => void apply(choice, "default")}
                      />
                    )}
                    {!local && choice.different && choice.targetFileExists && (
                      <Action
                        title="Use This Vault Value in Default"
                        icon={Icon.ArrowLeft}
                        onAction={() => void apply(choice, "target")}
                      />
                    )}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}

export default function CoreSettings({
  defaultVault,
  targetVault,
  onChanged,
}: {
  defaultVault: string;
  targetVault: string;
  onChanged?: Changed;
}) {
  const { push } = useNavigation();
  const { data, isLoading, error, revalidate } = usePromise(
    async (origin: string, target: string) => {
      const [settings, source, items] = await Promise.all([
        scanSettingChoices(origin, target),
        scanSettingChoices(origin),
        scanItems(origin, target),
      ]);
      const appearance = items.find((item) => item.category === "settings" && item.name === "appearance.json");
      const appearanceLinked = appearance?.state === "linked";
      let cssEntries: ActivationEntry[] = [];
      let cssProblem: string | undefined;
      try {
        cssEntries = await scanEnabledCssSnippets(origin, target, appearanceLinked);
      } catch (failure) {
        cssProblem = String(failure);
      }
      const groups: ActivationGroup[] = [
        ...SETTING_FILES.filter(({ name }) => name.endsWith("plugins.json")).map(({ name, title }) => ({
          id: name,
          title,
          file: name,
          entries: settings.choices.filter((choice) => choice.file === name),
          shared: false,
          problem: settings.problems.find((problem) => problem.file === name)?.message,
        })),
        {
          id: "enabledCssSnippets",
          title: "CSS Snippets",
          file: "appearance.json",
          entries: cssEntries,
          shared: appearanceLinked,
          problem: cssProblem,
        },
      ];
      const activationGroups = await Promise.all(
        groups.map(async (group): Promise<ActivationGroup> => {
          if (group.problem) return group;
          try {
            const visualPath = await activationOverlapVisual(
              group.file,
              group.title,
              group.entries,
              origin,
              target,
              group.shared,
            );
            return { ...group, visualPath };
          } catch (failure) {
            return { ...group, problem: String(failure) };
          }
        }),
      );
      const groupPreviews = Object.fromEntries(
        await Promise.all(
          SETTING_FILES.filter(({ name }) => !name.endsWith("plugins.json")).map(async ({ name, title }) => {
            const item = items.find((candidate) => candidate.category === "settings" && candidate.name === name);
            const linked = item?.state === "linked";
            const entries = linked
              ? sharedChoices(source.choices, name)
              : settings.choices.filter((choice) => choice.file === name);
            const problem = (linked ? source : settings).problems.find((entry) => entry.file === name)?.message;
            try {
              const visualPath = await settingsGroupVisual(title, name, entries, item?.state, problem, origin, target);
              return [name, { path: visualPath }] as const;
            } catch (failure) {
              return [name, { error: String(failure) }] as const;
            }
          }),
        ),
      );
      return {
        ...settings,
        source,
        files: items.filter((item) => item.category === "settings"),
        activationGroups,
        groupPreviews,
      };
    },
    [defaultVault, targetVault],
  );
  useVaultRefresh(defaultVault, targetVault, () => void revalidate());
  const files = data?.files ?? [];
  const appearanceItem = files.find((candidate) => candidate.name === "appearance.json");
  const isAppearanceLive = appearanceItem?.state === "linked";
  async function copyGroup(file: SettingFile, title: string) {
    if (!data) return;
    const item = files.find((candidate) => candidate.name === file);
    if (item?.state === "linked" || item?.state === "broken" || item?.state === "foreign-link") {
      await showToast({
        style: Toast.Style.Failure,
        title: `Review ${title} first`,
        message: "This group needs a physical local file before individual values can be copied.",
      });
      return;
    }
    const problem = data.problems.find((entry) => entry.file === file);
    if (problem) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Could not read ${title}`,
        message: problem.message,
      });
      return;
    }
    const plan = mirrorPlanFromScan(data);
    const ids = plan.ids.filter((id) => id.startsWith(`settings/${file}/`));
    if (!ids.length) {
      await showToast({ style: Toast.Style.Success, title: `${title} already matches` });
      return;
    }
    const removed = data.choices.filter(
      (choice) => choice.file === file && ids.includes(choice.id) && !choice.inDefault,
    ).length;
    const confirmed = await confirmAlert({
      title: `Copy Default ${title} values?`,
      message: `This updates ${ids.length} ${title} settings in this vault, including removing ${removed} values that exist only here. The previous local file will be backed up.`,
      primaryAction: { title: "Copy Values", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      const result = await syncSettingChoices(defaultVault, targetVault, ids, "default", plan.expected);
      await Promise.all([revalidate(), onChanged?.()]);
      await showToast({
        style: Toast.Style.Success,
        title: `${title} updated`,
        message: `${result.changed} values changed in this vault.`,
      });
    } catch (failure) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Could not copy ${title}`,
        message: String(failure),
      });
      void revalidate();
    }
  }

  function inspect(item: VaultItem) {
    push(
      <ItemInspector
        item={item}
        onChanged={async () => {
          await revalidate();
          await onChanged?.();
        }}
      />,
    );
  }

  return (
    <List
      navigationTitle={`Core Settings · ${path.basename(targetVault)}`}
      searchBarPlaceholder="Search settings groups..."
      isLoading={isLoading}
      isShowingDetail
    >
      {error ? (
        <List.EmptyView title="Could not read core settings" description={String(error)} icon={Icon.ExclamationMark} />
      ) : (
        <>
          <List.Section title="Settings">
            {SETTING_FILES.filter(({ name }) => !name.endsWith("plugins.json")).map(({ name, title }) => {
              const item = files.find((candidate) => candidate.name === name);
              const linked = item?.state === "linked";
              const unsafe = item?.state === "broken" || item?.state === "foreign-link";
              const canLink =
                isLinkableSettingsGroup(name) &&
                item &&
                (item.state === "available" || item.state === "native-identical" || item.state === "native-branched");
              return (
                <List.Item
                  key={name}
                  title={title}
                  subtitle={
                    unsafe
                      ? "Review link"
                      : linked
                        ? "Live link"
                        : name === "appearance.json"
                          ? "Local · CSS activation stays here"
                          : "Local file"
                  }
                  icon={unsafe ? Icon.ExclamationMark : linked ? Icon.Link : Icon.Document}
                  accessories={[
                    {
                      tag: {
                        value: unsafe ? "REVIEW" : linked ? "LIVE" : "LOCAL",
                        color: unsafe ? Color.Red : linked ? Color.Green : Color.Blue,
                      },
                    },
                  ]}
                  detail={<List.Item.Detail markdown={groupPreview(title, data?.groupPreviews[name])} />}
                  actions={
                    <ActionPanel>
                      <Action
                        title={`View ${title} Settings`}
                        icon={Icon.List}
                        onAction={() =>
                          push(
                            <SettingsGroup
                              file={name}
                              title={title}
                              defaultVault={defaultVault}
                              targetVault={targetVault}
                              onChanged={async () => {
                                await revalidate();
                                await onChanged?.();
                              }}
                            />,
                          )
                        }
                      />
                      {linked && isLinkableSettingsGroup(name) && item && (
                        <Action
                          title="Use Local Copy"
                          icon={Icon.Document}
                          shortcut={{ modifiers: ["cmd"], key: "return" }}
                          onAction={() =>
                            void (async () => {
                              try {
                                await detachItem(item);
                                await Promise.all([revalidate(), onChanged?.()]);
                                await showToast({ style: Toast.Style.Success, title: `${title} is now local` });
                              } catch (failure) {
                                await showToast({
                                  style: Toast.Style.Failure,
                                  title: "Could not detach settings",
                                  message: String(failure),
                                });
                              }
                            })()
                          }
                        />
                      )}
                      {canLink && (
                        <Action
                          title="Use Live Link"
                          icon={Icon.Link}
                          shortcut={{ modifiers: ["cmd"], key: "return" }}
                          onAction={() =>
                            void (async () => {
                              const confirmed = await confirmAlert({
                                title: `Live link ${title}?`,
                                message: `This vault will use the Default Vault's ${name} directly. Changes from either vault can change the shared file.${name === "appearance.json" ? " Enabled CSS snippets will also be shared between these vaults." : ""} Any existing local copy will be backed up.`,
                                primaryAction: { title: "Use Live Link", style: Alert.ActionStyle.Destructive },
                              });
                              if (!confirmed) return;
                              try {
                                const result = await linkSettingsGroup(defaultVault, targetVault, name, true);
                                await Promise.all([revalidate(), onChanged?.()]);
                                await showToast({
                                  style: Toast.Style.Success,
                                  title: `${title} linked`,
                                  message: result.backup
                                    ? `Previous local file saved at ${result.backup}`
                                    : "Using the Default Vault file live",
                                });
                              } catch (failure) {
                                await showToast({
                                  style: Toast.Style.Failure,
                                  title: "Could not link settings",
                                  message: String(failure),
                                });
                              }
                            })()
                          }
                        />
                      )}
                      {!linked && !unsafe && (
                        <Action
                          title="Copy Default Values to This Vault"
                          icon={Icon.ArrowDown}
                          shortcut={Keyboard.Shortcut.Common.Copy}
                          onAction={() => void copyGroup(name, title)}
                        />
                      )}
                      {item && (
                        <Action title="Inspect Entire File" icon={Icon.Document} onAction={() => inspect(item)} />
                      )}
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
          {!isAppearanceLive && (
            <List.Section title="Appearance → Enabled Items">
              {(data?.activationGroups ?? []).map((group) => {
                const item = files.find((candidate) => candidate.name === group.file);
                return (
                  <List.Item
                    key={group.id}
                    title={group.title}
                    icon={group.id === "enabledCssSnippets" ? Icon.Document : Icon.Gear}
                    accessories={[
                      {
                        tag: {
                          value: group.problem ? "REVIEW" : group.shared ? "SHARED" : "LOCAL",
                          color: group.problem ? Color.Red : group.shared ? Color.Green : Color.Purple,
                        },
                      },
                    ]}
                    detail={<List.Item.Detail markdown={activationMarkdown(group)} />}
                    actions={
                      <ActionPanel>
                        <Action
                          title={`Open ${group.title} Overview`}
                          icon={Icon.Eye}
                          onAction={() => push(<ActivationOverview group={group} targetVault={targetVault} />)}
                        />
                        {!group.problem && (
                          <Action
                            title="Browse Activation IDs"
                            icon={Icon.List}
                            onAction={() => push(<ActivationIds group={group} targetVault={targetVault} />)}
                          />
                        )}
                        {item && (
                          <Action title="Inspect Entire File" icon={Icon.Document} onAction={() => inspect(item)} />
                        )}
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
