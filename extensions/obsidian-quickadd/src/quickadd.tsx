import {
  Action,
  ActionPanel,
  Detail,
  getPreferenceValues,
  Icon,
  LaunchProps,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { createDeeplink, useFrecencySorting } from "@raycast/utils";
import { basename } from "path";
import { useEffect, useMemo, useState } from "react";
import ChoiceForm from "./ChoiceForm";
import { findCli, readRegistry } from "./cli";
import {
  ConfigError,
  findQuickAddVaults,
  isAmbiguousVault,
  loadChoices,
  registeredVaultPaths,
  vaultName,
} from "./config";
import { detectMode, REASON_TEXT } from "./mode";
import { runChoice } from "./run";
import RunSession from "./RunSession";
import { Choice } from "./types";

type LaunchContext = { vaultPath?: string; choiceId?: string; relaunched?: boolean };

export default function Command(props: LaunchProps<{ launchContext?: LaunchContext }>) {
  const context = props.launchContext ?? {};
  const { vaultPath: preferredPath, cliPath } = getPreferenceValues<Preferences>();
  const vaults = useMemo(() => (preferredPath ? [preferredPath] : findQuickAddVaults()), [preferredPath]);
  const target = context.vaultPath ?? (vaults.length === 1 ? vaults[0] : undefined);
  const registered = useMemo(() => registeredVaultPaths(), []);

  if (target)
    return <Choices vaultPath={target} choiceId={context.choiceId} cliPath={cliPath} relaunched={context.relaunched} />;
  if (vaults.length === 0) {
    return (
      <ErrorView message="No Obsidian vault with QuickAdd was found. Set the vault folder in the extension preferences." />
    );
  }
  return (
    <List searchBarPlaceholder="Choose a vault">
      {vaults.map((path) => (
        <List.Item
          key={path}
          title={basename(path)}
          subtitle={path}
          icon={Icon.Folder}
          accessories={
            isAmbiguousVault(path, registered) ? [{ tag: "Same name as another vault", icon: Icon.Warning }] : []
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Open Vault"
                icon={Icon.ArrowRight}
                target={<Choices vaultPath={path} cliPath={cliPath} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function Choices({
  vaultPath,
  choiceId,
  cliPath,
  relaunched,
}: {
  vaultPath: string;
  choiceId?: string;
  cliPath?: string;
  relaunched?: boolean;
}) {
  const [checks, setChecks] = useState(0);
  const mode = useMemo(() => detectMode(findCli(cliPath || undefined), readRegistry()), [cliPath, checks]);
  const loaded = useMemo((): { choices: Choice[]; error?: string } => {
    if (isAmbiguousVault(vaultPath, registeredVaultPaths())) {
      return {
        choices: [],
        error: `Another Obsidian vault is also named “${vaultName(vaultPath)}”. Obsidian can't tell them apart, so QuickAdd can't be run safely here. Rename one of the vault folders, or remove the one you no longer use from Obsidian's vault list.`,
      };
    }
    try {
      return { choices: loadChoices(vaultPath) };
    } catch (error) {
      return { choices: [], error: error instanceof ConfigError ? error.message : String(error) };
    }
  }, [vaultPath]);
  const { data: sorted, visitItem } = useFrecencySorting(loaded.choices, { key: (c) => c.id, namespace: vaultPath });
  const name = vaultName(vaultPath);
  const direct = choiceId ? loaded.choices.find((c) => c.id === choiceId) : undefined;

  useEffect(() => {
    if (!choiceId || loaded.error) return;
    if (!direct) showToast({ style: Toast.Style.Failure, title: "Choice no longer exists" });
    else if (mode.mode === "basic" && direct.fields.length === 0) runChoice(name, direct, []);
  }, []);

  if (loaded.error) return <ErrorView message={loaded.error} />;
  if (direct) {
    if (mode.mode === "full")
      return (
        <RunSession cli={mode.cli} vaultPath={vaultPath} vaultName={name} choice={direct} relaunched={relaunched} />
      );
    if (direct.fields.length > 0)
      return <ChoiceForm vaultName={name} vault={{ vaultPath, vaultName: name }} choice={direct} />;
    return <List isLoading />;
  }

  const primaryAction = (choice: Choice) => {
    if (mode.mode === "full") {
      return (
        <Action.Push
          title="Run"
          icon={Icon.Play}
          target={<RunSession cli={mode.cli} vaultPath={vaultPath} vaultName={name} choice={choice} />}
          onPush={() => visitItem(choice)}
        />
      );
    }
    if (choice.fields.length > 0) {
      return (
        <Action.Push
          title="Fill in"
          icon={Icon.Pencil}
          target={<ChoiceForm vaultName={name} vault={{ vaultPath, vaultName: name }} choice={choice} />}
          onPush={() => visitItem(choice)}
        />
      );
    }
    return (
      <Action
        title="Run"
        icon={Icon.Play}
        onAction={() => {
          visitItem(choice);
          runChoice(name, choice, []);
        }}
      />
    );
  };

  return (
    <List searchBarPlaceholder="Search QuickAdd choices">
      <List.EmptyView
        icon={Icon.Plus}
        title="No QuickAdd choices"
        description="Add choices in Obsidian under Settings → QuickAdd."
      />
      {mode.mode === "basic" ? (
        <List.Section title="Basic Mode">
          <List.Item
            title="Full QuickAdd support is off"
            subtitle={REASON_TEXT[mode.reason]}
            icon={Icon.Warning}
            actions={
              <ActionPanel>
                <Action title="Check Again" icon={Icon.ArrowClockwise} onAction={() => setChecks((n) => n + 1)} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
      <List.Section title="Choices">
        {sorted.map((choice) => (
          <List.Item
            key={choice.id}
            title={choice.title}
            icon={choice.type === "Capture" ? Icon.Plus : Icon.Document}
            accessories={[{ tag: choice.type }]}
            actions={
              <ActionPanel>
                {primaryAction(choice)}
                <Action.CreateQuicklink
                  title="Create Quicklink"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
                  quicklink={{
                    name: `QuickAdd: ${choice.name}`,
                    link: createDeeplink({ command: "quickadd", context: { vaultPath, choiceId: choice.id } }),
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function ErrorView({ message }: { message: string }) {
  return (
    <Detail
      markdown={`# QuickAdd unavailable\n\n${message}`}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
