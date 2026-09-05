import {
  Action,
  ActionPanel,
  Alert,
  closeMainWindow,
  confirmAlert,
  Detail,
  Form,
  getPreferenceValues,
  Icon,
  List,
  open,
  openExtensionPreferences,
  popToRoot,
  PopToRootType,
  showToast,
  trash,
  Toast,
} from "@raycast/api";
import path from "node:path";
import { useEffect, useState } from "react";

import { VaultSelection } from "./components/VaultSelection";
import { discoverObsidianVaults } from "./obsidian-vaults";
import {
  addRecentCapture,
  getRecentCaptures,
  getSelectedVault,
  removeRecentCapture,
  saveSelectedVault,
} from "./storage";
import { ObsidianVault, ProviderConfig, RecentCapture } from "./types";
import { buildVaultProfile, createNote, validateNotePath } from "./vault";

export default function SmartCaptureCommand() {
  return <SmartCaptureApp />;
}

export function SmartCaptureApp({ startInCapture = false }: { startInCapture?: boolean }) {
  const preferences = getPreferenceValues<Preferences>();
  const config: ProviderConfig = {
    provider: preferences.provider,
    model: preferences.model,
    apiKey: preferences.apiKey,
  };
  const [vaults, setVaults] = useState<ObsidianVault[]>([]);
  const [selectedVault, setSelectedVault] = useState<ObsidianVault>();
  const [recentCaptures, setRecentCaptures] = useState<RecentCapture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    discoverObsidianVaults()
      .then(async (discoveredVaults) => {
        setVaults(discoveredVaults);
        const rememberedVault = await getSelectedVault(discoveredVaults);
        setSelectedVault(rememberedVault);
        if (rememberedVault) setRecentCaptures(await getRecentCaptures(rememberedVault.path));
      })
      .finally(() => setLoading(false));
  }, []);

  const selectVault = async (vault: ObsidianVault) => {
    await saveSelectedVault(vault);
    setSelectedVault(vault);
    setRecentCaptures(await getRecentCaptures(vault.path));
  };

  if (loading) return <Detail isLoading />;
  if (!selectedVault) {
    if (vaults.length === 0) {
      return (
        <Detail markdown="# No Obsidian vaults found\n\nOpen Obsidian once so it can register your vaults, then reload this command." />
      );
    }

    return <VaultSelection vaults={vaults} onSelect={selectVault} />;
  }

  const deleteCapture = async (capture: RecentCapture) => {
    const confirmed = await confirmAlert({
      title: `Move ${capture.title} to Trash?`,
      message: `This moves ${capture.relativePath} from ${selectedVault.name} to the macOS Trash.`,
      primaryAction: { title: "Move to Trash", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    try {
      await trash(validateNotePath(selectedVault.path, capture.absolutePath));
      await removeRecentCapture(capture.absolutePath);
      setRecentCaptures((current) => current.filter((item) => item.absolutePath !== capture.absolutePath));
      await showToast({ style: Toast.Style.Success, title: `Moved ${capture.title} to Trash` });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not move note to Trash",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const vaultSelection = <VaultSelection vaults={vaults} onSelect={selectVault} popAfterSelect />;
  const captureForm = (
    <CaptureForm
      config={config}
      vault={selectedVault}
      vaultSelection={vaultSelection}
      navigationTitle={startInCapture ? undefined : `New Capture - ${selectedVault.name}`}
    />
  );

  if (startInCapture) return captureForm;

  return (
    <CaptureDashboard
      vault={selectedVault}
      recentCaptures={recentCaptures}
      captureForm={captureForm}
      vaultSelection={vaultSelection}
      onDeleteCapture={deleteCapture}
    />
  );
}

function CaptureDashboard({
  vault,
  recentCaptures,
  captureForm,
  vaultSelection,
  onDeleteCapture,
}: {
  vault: ObsidianVault;
  recentCaptures: RecentCapture[];
  captureForm: React.ReactNode;
  vaultSelection: React.ReactNode;
  onDeleteCapture: (capture: RecentCapture) => void | Promise<void>;
}) {
  return (
    <List searchBarPlaceholder="Search recent captures...">
      <List.Section title="Capture">
        <List.Item
          icon={Icon.Plus}
          title="New Note"
          subtitle={`Capture directly into ${vault.name}`}
          actions={
            <DashboardActions
              captureForm={captureForm}
              vaultSelection={vaultSelection}
              onDeleteCapture={onDeleteCapture}
            />
          }
        />
      </List.Section>
      <List.Section title="Recent Captures" subtitle={`${recentCaptures.length} of 5`}>
        {recentCaptures.map((capture) => {
          const folder = path.dirname(capture.relativePath);
          return (
            <List.Item
              key={capture.absolutePath}
              icon={Icon.Document}
              title={capture.title}
              subtitle={folder === "." ? vault.name : folder}
              accessories={[{ date: new Date(capture.createdAt), tooltip: "Created" }]}
              actions={
                <DashboardActions
                  captureForm={captureForm}
                  vaultSelection={vaultSelection}
                  recentCapture={capture}
                  onDeleteCapture={onDeleteCapture}
                />
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function DashboardActions({
  captureForm,
  vaultSelection,
  recentCapture,
  onDeleteCapture,
}: {
  captureForm: React.ReactNode;
  vaultSelection: React.ReactNode;
  recentCapture?: RecentCapture;
  onDeleteCapture: (capture: RecentCapture) => void | Promise<void>;
}) {
  return (
    <ActionPanel title={recentCapture?.title}>
      <ActionPanel.Section>
        {recentCapture && (
          <Action
            title="Open in Obsidian"
            icon={Icon.ArrowNe}
            onAction={() => open(`obsidian://open?path=${encodeURIComponent(recentCapture.absolutePath)}`)}
          />
        )}
        <Action.Push
          title="New Capture"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          target={captureForm}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        <Action.Push title="Change Vault" icon={Icon.Folder} target={vaultSelection} />
      </ActionPanel.Section>
      {recentCapture && (
        <ActionPanel.Section>
          <Action
            title="Move Note to Trash"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() => onDeleteCapture(recentCapture)}
          />
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );
}

function CaptureForm({
  config,
  vault,
  vaultSelection,
  navigationTitle,
}: {
  config: ProviderConfig;
  vault: ObsidianVault;
  vaultSelection: React.ReactNode;
  navigationTitle?: string;
}) {
  const preferences = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(false);

  async function submit(values: { content: string }) {
    const content = values.content.trim();
    if (!content) {
      await showToast({ style: Toast.Style.Failure, title: "Write something first" });
      return;
    }

    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Reading vault patterns" });
    await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Suspended });

    try {
      const startedAt = Date.now();
      console.info(`[Smart Capture] Profiling vault: ${vault.name}`);
      const profile = await buildVaultProfile(vault.path);
      console.info(
        `[Smart Capture] Profile ready in ${Date.now() - startedAt}ms (${profile.candidateFolders.length} folders, ${
          profile.context.length
        } characters)`
      );
      toast.title = "Choosing a destination";
      const { classifyNote } = await import("./classifier");
      const classification = await classifyNote(config, profile, content);
      console.info(`[Smart Capture] Classified in ${Date.now() - startedAt}ms: ${classification.folder}`);
      const created = await createNote(vault.path, classification, content);
      await addRecentCapture({
        ...created,
        title: classification.title,
        vaultPath: vault.path,
        createdAt: new Date().toISOString(),
      });
      const target = `obsidian://open?path=${encodeURIComponent(created.absolutePath)}`;

      toast.style = Toast.Style.Success;
      toast.title = `Created ${classification.title}`;
      toast.message = `${created.relativePath} - ${Math.round(classification.confidence * 100)}% confidence`;
      toast.primaryAction = { title: "Open in Obsidian", onAction: () => open(target) };

      if (preferences.openAfterCreate) await open(target);
    } catch (error) {
      console.error("[Smart Capture] Capture failed", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Could not create note";
      toast.message = error instanceof Error ? error.message : String(error);
    } finally {
      setIsLoading(false);
      await popToRoot({ clearSearchBar: true });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={`Capture to ${vault.name}`} icon={Icon.Wand} onSubmit={submit} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <Action.Push title="Change Vault" icon={Icon.Folder} target={vaultSelection} />
        </ActionPanel>
      }
    >
      <Form.Description title={vault.name} text="Selected Obsidian vault" />
      <Form.Separator />
      <Form.TextArea
        id="content"
        title="Capture"
        placeholder={`Write or paste your note here.\n\nSmart Capture will create a title, choose the best existing folder, and send uncertain notes to the vault root.\n\nPress Command + Enter to file it in the background.`}
        info={`This note will be organized inside ${vault.name}.`}
        enableMarkdown
        autoFocus
      />
    </Form>
  );
}
