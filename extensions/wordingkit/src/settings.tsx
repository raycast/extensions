import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  getPreferenceValues,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  deleteMode,
  loadModeSettings,
  moveMode,
  resetModes,
  setSortMode,
  type EditingMode,
} from "./modes";
import ModeForm from "./mode-form";
import { DEFAULT_LANGUAGE, isLanguage } from "./language";
import { getUiStrings } from "./i18n";

type SortMode = "custom" | "last-used";

export default function Settings() {
  const [modes, setModes] = useState<EditingMode[]>([]);
  const [sortMode, setSelectedSortMode] = useState<SortMode>("custom");
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  async function reloadModes() {
    setIsLoading(true);
    try {
      const settings = await loadModeSettings();
      setModes(settings.modes);
      setSelectedSortMode(settings.sortMode);
      setError(undefined);
    } catch (reason) {
      setError(String(reason));
    } finally {
      setIsLoading(false);
    }
  }

  async function changeSortMode(nextSortMode: SortMode) {
    try {
      await setSortMode(nextSortMode);
      await reloadModes();
    } catch (reason) {
      await showToast({
        style: Toast.Style.Failure,
        title: getUiStrings().actionFailed(getUiStrings().orderInRewrite),
        message: String(reason),
      });
    }
  }

  async function moveModeBy(id: string, direction: "up" | "down") {
    try {
      await moveMode(id, direction);
      await reloadModes();
    } catch (reason) {
      await showToast({
        style: Toast.Style.Failure,
        title: getUiStrings().actionFailed(getUiStrings().moveUp),
        message: String(reason),
      });
    }
  }

  useEffect(() => {
    void reloadModes();
  }, []);

  async function removeMode(mode: EditingMode) {
    const confirmed = await confirmAlert({
      title: getUiStrings().deleteModeQuestion,
      message: getUiStrings().deleteModeDescription(mode.title),
      primaryAction: {
        title: getUiStrings().deleteMode,
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    try {
      await deleteMode(mode.id);
      await reloadModes();
    } catch (reason) {
      await showToast({
        style: Toast.Style.Failure,
        title: getUiStrings().actionFailed(getUiStrings().deleteMode),
        message: String(reason),
      });
    }
  }

  async function resetCorruptedModes() {
    const ui = getUiStrings();
    const confirmed = await confirmAlert({
      title: ui.resetModesQuestion,
      message: ui.resetModesDescription(
        presetLanguage === "en" ? ui.english : ui.russian,
      ),
      primaryAction: {
        title: ui.reset,
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    try {
      await resetModes(presetLanguage);
      await reloadModes();
    } catch (reason) {
      await showToast({
        style: Toast.Style.Failure,
        title: ui.actionFailed(ui.resetModes),
        message: String(reason),
      });
    }
  }

  const preferences = getPreferenceValues<Preferences.Settings>();
  const presetLanguage = isLanguage(preferences.presetLanguage)
    ? preferences.presetLanguage
    : DEFAULT_LANGUAGE;
  const ui = getUiStrings();

  const createAction = (
    <Action.Push
      title={ui.createMode}
      icon={Icon.Plus}
      target={<ModeForm onSaved={reloadModes} />}
    />
  );

  const sortAction = (
    <ActionPanel.Submenu title={ui.orderInRewrite} icon={Icon.List}>
      <Action
        title={ui.customOrder}
        icon={sortMode === "custom" ? Icon.Check : undefined}
        onAction={() => changeSortMode("custom")}
      />
      <Action
        title={ui.lastUsedOrder}
        icon={sortMode === "last-used" ? Icon.Check : undefined}
        onAction={() => changeSortMode("last-used")}
      />
    </ActionPanel.Submenu>
  );

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={ui.editingModes}
          description={String(error)}
          actions={
            <ActionPanel>
              <Action
                title={ui.resetModes}
                icon={Icon.ArrowClockwise}
                style={Action.Style.Destructive}
                onAction={resetCorruptedModes}
              />
              {createAction}
              <Action
                title={ui.openPreferences}
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle={ui.editingModes}>
      {modes.map((mode, index) => (
        <List.Item
          key={mode.id}
          icon={Icon.Text}
          title={mode.title}
          subtitle={mode.description}
          accessories={[{ text: mode.provider }, { text: mode.model }]}
          actions={
            <ActionPanel>
              <Action.Push
                title={ui.editMode}
                icon={Icon.Pencil}
                target={<ModeForm mode={mode} onSaved={reloadModes} />}
              />
              {createAction}
              {sortAction}
              {index > 0 ? (
                <Action
                  title={ui.moveUp}
                  icon={Icon.ArrowUp}
                  onAction={() => moveModeBy(mode.id, "up")}
                />
              ) : null}
              {index < modes.length - 1 ? (
                <Action
                  title={ui.moveDown}
                  icon={Icon.ArrowDown}
                  onAction={() => moveModeBy(mode.id, "down")}
                />
              ) : null}
              <Action
                title={ui.deleteMode}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => removeMode(mode)}
              />
              <Action
                title={ui.openPreferences}
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && modes.length === 0 ? (
        <List.EmptyView
          icon={Icon.Text}
          title={ui.noModes}
          description={ui.noModesDescription}
          actions={
            <ActionPanel>
              {createAction}
              {sortAction}
              <Action
                title={ui.openPreferences}
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
