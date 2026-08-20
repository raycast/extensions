import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  Keyboard,
  List,
  showInFinder,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { homedir } from "node:os";
import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import { useState } from "react";
import { DestructiveAction, PinAction } from "./actions";
import { PreferencesActionSection } from "./actions/preferences";
import { CLAUDE_ICON } from "./constants";
import { DEFAULT_MODEL, useModel } from "./hooks/useModel";
import type { Model } from "./type";
import { exportPresetsToYaml } from "./utils/presetYaml";
import { resolveToast } from "./utils/toast";
import { ModelForm } from "./views/model/form";
import { ModelImportForm } from "./views/model/import";
import { ModelListItem, ModelListView } from "./views/model/list";

export default function Model() {
  const models = useModel();
  const [searchText, setSearchText] = useState<string>("");
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  const { push } = useNavigation();

  /**
   * Writes every non-default preset to a timestamped YAML file in Downloads — a normal,
   * user-visible location for a file meant to be reviewed, diffed, and shared, unlike the
   * extension's hidden `supportPath`. Reveals it via "Show in Finder" rather than a
   * blind "saved" toast, since the whole point of export is having a real file to open.
   */
  const exportPresets = async () => {
    const toast = await showToast({ title: "Exporting presets...", style: Toast.Style.Animated });
    try {
      const yamlText = exportPresetsToYaml(models.data);
      const filePath = join(
        homedir(),
        "Downloads",
        `claude-presets-${new Date().toISOString().replace(/[:.]/g, "-")}.yaml`,
      );
      await writeFile(filePath, yamlText, "utf-8");
      // Hide-and-reshow rather than mutating the live toast — see `src/utils/toast.ts`.
      await resolveToast(toast, {
        style: Toast.Style.Success,
        title: "Presets exported",
        message: filePath,
        primaryAction: {
          title: "Show in Finder",
          onAction: async () => {
            await showInFinder(filePath);
          },
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await resolveToast(toast, {
        style: Toast.Style.Failure,
        title: "Export failed",
        message,
        primaryAction: {
          title: "Copy Error",
          onAction: async () => {
            await Clipboard.copy(message);
          },
        },
      });
    }
  };

  const importExportSection = (
    <ActionPanel.Section title="Import / Export">
      <Action
        title="Export Presets to YAML"
        icon={Icon.Download}
        shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
        onAction={exportPresets}
      />
      <Action
        title="Import Presets…"
        icon={Icon.Upload}
        shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
        onAction={() => push(<ModelImportForm use={{ models }} />)}
      />
    </ActionPanel.Section>
  );

  const getActionPanel = (model: Model) => (
    <ActionPanel>
      <Action
        title="Edit Preset"
        shortcut={Keyboard.Shortcut.Common.Edit}
        icon={Icon.Pencil}
        onAction={() => push(<ModelForm model={model} use={{ models }} />)}
      />
      <Action
        title="Create Preset"
        shortcut={Keyboard.Shortcut.Common.New}
        icon={Icon.Plus}
        onAction={() => push(<ModelForm name={searchText} use={{ models }} />)}
      />
      {model.id !== "default" && (
        <>
          <PinAction
            title={model.pinned ? "Unpin Preset" : "Pin Preset"}
            isPinned={model.pinned}
            onAction={() => models.update({ ...model, pinned: !model.pinned })}
          />
          <ActionPanel.Section title="Delete">
            <DestructiveAction
              title="Delete Preset"
              dialog={{
                title: "Are you sure you want to delete this preset?",
              }}
              onAction={() => models.remove(model)}
            />
          </ActionPanel.Section>
        </>
      )}
      {importExportSection}
      <PreferencesActionSection />
    </ActionPanel>
  );

  // Copy before sorting — an in-place sort reorders the hook's state array, which is the
  // same array that gets persisted.
  const sortedModels = [...models.data].sort(
    (a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime(),
  );

  const filteredModels = sortedModels
    .filter((value, index, self) => index === self.findIndex((model) => model.id === value.id))
    .filter((model) => {
      if (searchText === "") {
        return true;
      }
      return (
        model.prompt.toLowerCase().includes(searchText.toLowerCase()) ||
        model.name.toLowerCase().includes(searchText.toLowerCase()) ||
        model.temperature.toLocaleString().toLowerCase().includes(searchText.toLowerCase())
      );
    });

  // No `?? DEFAULT_MODEL` fallback: the built-in preset is a row like any other and must
  // disappear when the search does not match it. The fallback made it render on every
  // non-empty result set, so a query matching one custom preset showed two.
  const defaultModelOnly = filteredModels.find((x) => x.id === DEFAULT_MODEL.id);

  const customModelsOnly = filteredModels.filter((x) => x.id !== DEFAULT_MODEL.id);

  return (
    <List
      isShowingDetail={filteredModels.length === 0 ? false : true}
      isLoading={models.isLoading}
      filtering={false}
      throttle={false}
      navigationTitle={"Presets"}
      selectedItemId={selectedModelId || undefined}
      onSelectionChange={(id) => {
        if (id !== selectedModelId) {
          setSelectedModelId(id);
        }
      }}
      searchBarPlaceholder="Search presets..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {models.data.length === 0 ? (
        <List.EmptyView
          title="No Presets Yet"
          description="Create one to save a system prompt, temperature, and output limit."
          icon={CLAUDE_ICON}
          actions={
            <ActionPanel>
              <Action
                title="Create Preset"
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
                onAction={() => push(<ModelForm name={searchText} use={{ models }} />)}
              />
              <ActionPanel.Section title="Import / Export">
                <Action
                  title="Import Presets…"
                  icon={Icon.Upload}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                  onAction={() => push(<ModelImportForm use={{ models }} />)}
                />
              </ActionPanel.Section>
              <PreferencesActionSection />
            </ActionPanel>
          }
        />
      ) : filteredModels.length === 0 ? (
        <List.EmptyView
          title="No Matching Presets"
          description={`Nothing matches "${searchText}".`}
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action title="Clear Search" icon={Icon.XMarkCircle} onAction={() => setSearchText("")} />
              <Action
                title="Create Preset"
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
                onAction={() => push(<ModelForm name={searchText} use={{ models }} />)}
              />
              {importExportSection}
              <PreferencesActionSection />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {defaultModelOnly && (
            <ModelListItem
              key="default"
              model={defaultModelOnly}
              selectedModel={selectedModelId}
              actionPanel={getActionPanel}
            />
          )}
          <ModelListView
            key="pinned"
            title="Pinned"
            models={customModelsOnly.filter((x) => x.pinned)}
            selectedModel={selectedModelId}
            actionPanel={getActionPanel}
          />
          <ModelListView
            key="models"
            title="Presets"
            models={customModelsOnly.filter((x) => !x.pinned)}
            selectedModel={selectedModelId}
            actionPanel={getActionPanel}
          />
        </>
      )}
    </List>
  );
}
