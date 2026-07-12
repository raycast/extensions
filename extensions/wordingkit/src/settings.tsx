import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
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
  setLanguage,
  setSortMode,
  type EditingMode,
} from "./modes";
import ModeForm from "./mode-form";
import { DEFAULT_LANGUAGE, type Language } from "./language";
import { getUiStrings } from "./i18n";

type SortMode = "custom" | "last-used";

export default function Settings() {
  const [modes, setModes] = useState<EditingMode[]>([]);
  const [sortMode, setSelectedSortMode] = useState<SortMode>("custom");
  const [language, setSelectedLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  async function reloadModes() {
    setIsLoading(true);
    try {
      const settings = await loadModeSettings();
      setModes(settings.modes);
      setSelectedSortMode(settings.sortMode);
      setSelectedLanguage(settings.language);
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
        title: getUiStrings(language).actionFailed(
          getUiStrings(language).orderInRewrite,
        ),
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
        title: getUiStrings(language).actionFailed(
          getUiStrings(language).moveUp,
        ),
        message: String(reason),
      });
    }
  }

  useEffect(() => {
    void reloadModes();
  }, []);

  async function removeMode(mode: EditingMode) {
    const confirmed = await confirmAlert({
      title: getUiStrings(language).deleteModeQuestion,
      message: getUiStrings(language).deleteModeDescription(mode.title),
      primaryAction: {
        title: getUiStrings(language).deleteMode,
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
        title: getUiStrings(language).actionFailed(
          getUiStrings(language).deleteMode,
        ),
        message: String(reason),
      });
    }
  }

  async function resetCorruptedModes() {
    const ui = getUiStrings(language);
    const confirmed = await confirmAlert({
      title: ui.resetModesQuestion,
      message: ui.resetModesDescription(languageName(language, ui)),
      primaryAction: {
        title: ui.reset,
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    try {
      await resetModes();
      await reloadModes();
    } catch (reason) {
      await showToast({
        style: Toast.Style.Failure,
        title: ui.actionFailed(ui.resetModes),
        message: String(reason),
      });
    }
  }

  async function changeLanguage(nextLanguage: Language) {
    try {
      await setLanguage(nextLanguage);
      await reloadModes();
    } catch (reason) {
      await showToast({ style: Toast.Style.Failure, title: String(reason) });
    }
  }

  const ui = getUiStrings(language);
  function languageName(value: Language, strings = ui): string {
    return value === "en" ? strings.english : strings.russian;
  }

  const createAction = (
    <Action.Push
      title={ui.createMode}
      icon={Icon.Plus}
      target={<ModeForm language={language} onSaved={reloadModes} />}
    />
  );

  const sortAction = (
    <ActionPanel.Submenu title={ui.orderInRewrite} icon={Icon.Bars3BottomLeft}>
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
      <List.Item
        icon={Icon.Globe}
        title={ui.language}
        subtitle={ui.currentPreset(languageName(language))}
        actions={
          <ActionPanel>
            <ActionPanel.Submenu title={ui.changeLanguage} icon={Icon.Globe}>
              <Action
                title={ui.english}
                icon={language === "en" ? Icon.Check : undefined}
                onAction={() => changeLanguage("en")}
              />
              <Action
                title={ui.russian}
                icon={language === "ru" ? Icon.Check : undefined}
                onAction={() => changeLanguage("ru")}
              />
            </ActionPanel.Submenu>
            <Action
              title={ui.resetModes}
              icon={Icon.ArrowClockwise}
              style={Action.Style.Destructive}
              onAction={resetCorruptedModes}
            />
          </ActionPanel>
        }
      />
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
                target={
                  <ModeForm
                    mode={mode}
                    language={language}
                    onSaved={reloadModes}
                  />
                }
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
