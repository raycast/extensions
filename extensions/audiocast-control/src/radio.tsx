import { Action, ActionPanel, Icon, List, showToast, Toast, useNavigation, Keyboard } from "@raycast/api";
import { type FC, useCallback, useEffect, useMemo, useState } from "react";
import { playUrl } from "./api/player";
import { useAllRadio } from "./hooks/useAllRadio";
import { cache } from "./lib/cache";
import { type Radio, remove } from "./lib/radioDB";
import { exportRadios } from "./lib/radioImportExport";
import { RadioStationAddEditForm } from "./components/RadioStationAddEditForm";
import { RadiosImportForm } from "./components/RadiosImportForm";
import { RadioDetails } from "./components/RadioDetails";
import { usePlayerUrl } from "./hooks/usePlayerUrl";
import { usePlayerStatus } from "./hooks/usePlayerStatus";
import { PlayerMode } from "./api/player";
import { type UseActionOptions, useAction } from "./hooks/useAction";
import { createLog } from "./lib/debug";

const logger = createLog("radio");

interface RadioActionProps {
  playerUrl?: string;
  radio: Radio;
  onActionStateChange?: (isPerforming: boolean) => void;
  onSuccess?: () => void;
}

const PlayRadioAction: FC<RadioActionProps> = ({ radio, onActionStateChange, playerUrl }) => {
  const playRadioActionOptions = useMemo<UseActionOptions>(
    () => ({
      successMessage: `${cache.deviceName} is playing "${radio.title}" radio`,
      errorMessage: `Failed to play "${radio.title}" radio`,
      closeMainWindowOnSuccess: true,
    }),
    [radio.title],
  );
  const playRadioAction = useCallback(async () => {
    if (!playerUrl) {
      return;
    }

    return playUrl(playerUrl, radio.url);
  }, [playerUrl, radio.url]);
  const { action: onPlayAction, isPerformingAction: isStartingPlayingRadio } = useAction(
    playRadioAction,
    playRadioActionOptions,
  );
  useEffect(() => onActionStateChange?.(isStartingPlayingRadio), [isStartingPlayingRadio]);

  return <Action autoFocus title="Play" icon={Icon.Play} onAction={onPlayAction} />;
};

const EditRadioAction: FC<RadioActionProps> = ({ radio, onSuccess }) => {
  const { push } = useNavigation();
  const onEditSuccess = useCallback(() => {
    onSuccess?.();
  }, [onSuccess]);
  const onEditAction = useCallback(
    () => push(<RadioStationAddEditForm radio={radio} onSubmitSuccess={onEditSuccess} />),
    [radio],
  );

  return <Action title="Edit" icon={Icon.Pencil} shortcut={Keyboard.Shortcut.Common.Edit} onAction={onEditAction} />;
};

const DeleteRadioAction: FC<RadioActionProps> = ({ radio, onSuccess, onActionStateChange }) => {
  const removeRadioAction = useCallback(async () => {
    await remove(radio.id);
  }, [radio.id]);
  const removeRadioActionOptions = useMemo(
    () => ({
      successMessage: `Radio "${radio.title}" station was deleted`,
      errorMessage: `Failed to delete "${radio.title}" the radio station`,
      onSuccess,
    }),
    [radio.title, onSuccess],
  );
  const { action: onRemoveRadioAction, isPerformingAction: isDeletingRadio } = useAction(
    removeRadioAction,
    removeRadioActionOptions,
  );
  useEffect(() => onActionStateChange?.(isDeletingRadio), [isDeletingRadio]);

  return (
    <Action
      title="Remove"
      icon={Icon.Trash}
      shortcut={Keyboard.Shortcut.Common.Remove}
      style={Action.Style.Destructive}
      onAction={onRemoveRadioAction}
    />
  );
};

const ImportRadiosAction: FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const { push } = useNavigation();
  const onImportAction = useCallback(() => push(<RadiosImportForm onSubmitSuccess={onSuccess} />), [onSuccess]);

  return (
    <Action
      title="Import Radios"
      icon={Icon.Upload}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "i" },
        Windows: { modifiers: ["ctrl", "shift"], key: "i" },
      }}
      onAction={onImportAction}
    />
  );
};

const ExportRadiosAction: FC<{ onActionStateChange?: (isPerforming: boolean) => void }> = ({ onActionStateChange }) => {
  const [isExporting, setIsExporting] = useState(false);
  const onExportAction = useCallback(async () => {
    setIsExporting(true);

    try {
      const path = await exportRadios();
      showToast({ title: "Radios exported", message: path, style: Toast.Style.Success });
    } catch (error) {
      logger.error(`Failed to export radios: ${error}`);
      showToast({ title: "Failed to export radios", style: Toast.Style.Failure });
    } finally {
      setIsExporting(false);
    }
  }, []);
  useEffect(() => onActionStateChange?.(isExporting), [isExporting]);

  return (
    <Action
      title="Export Radios"
      icon={Icon.Download}
      shortcut={Keyboard.Shortcut.Common.Save}
      onAction={onExportAction}
    />
  );
};

export default function Command() {
  const { push } = useNavigation();
  const { data: playerUrl } = usePlayerUrl();
  const { data: playerStatus, revalidate: refreshPlayerStatus } = usePlayerStatus();
  const isPlayingRadio = !playerStatus?.isStopped && playerStatus?.mode === PlayerMode.Radio;
  const [currentRadio, setCurrentRadio] = useState<number | null>(null);
  const { data: radioStations = [], isLoading: areRadioStationsLoading, revalidate: refreshRadio } = useAllRadio();
  const [isPerformingAction, setIsPerformingAction] = useState<boolean>(false);
  const onPerformingActionStateChange = useCallback(
    (isPerformingAction: boolean) => setIsPerformingAction(isPerformingAction),
    [],
  );

  const onSelectionChange = useCallback(
    (radioId: string | null) => setCurrentRadio(radioId ? parseInt(radioId, 10) : null),
    [],
  );
  const onAddRadioSuccess = useCallback(() => {
    refreshRadio();
    refreshPlayerStatus();
  }, [refreshRadio, refreshPlayerStatus]);
  const onAddRadioAction = useCallback(() => {
    push(<RadioStationAddEditForm onSubmitSuccess={onAddRadioSuccess} />);
  }, [onAddRadioSuccess]);
  const listManagementActions = useMemo(
    () => (
      <ActionPanel.Section title="Manage Radios">
        <Action
          title="Add Radio"
          icon={Icon.PlusCircle}
          shortcut={Keyboard.Shortcut.Common.New}
          onAction={onAddRadioAction}
        />
        <ImportRadiosAction onSuccess={refreshRadio} />
        <ExportRadiosAction onActionStateChange={onPerformingActionStateChange} />
      </ActionPanel.Section>
    ),
    [onAddRadioAction, refreshRadio, onPerformingActionStateChange],
  );

  return (
    <List
      isLoading={areRadioStationsLoading || isPerformingAction}
      navigationTitle="Your favorite radio stations"
      searchBarPlaceholder="Search your favorite radio"
      onSelectionChange={onSelectionChange}
      actions={<ActionPanel>{listManagementActions}</ActionPanel>}
      isShowingDetail
      filtering
    >
      {radioStations.map((radio) => (
        <List.Item
          id={radio.id.toString()}
          key={radio.id}
          title={`${isPlayingRadio && cache.lastPlayedRadioUrl === radio.url ? "♪ " : ""}${radio.title}`}
          subtitle={radio.description ?? ""}
          detail={<RadioDetails isActive={currentRadio === radio.id} radio={radio} />}
          actions={
            <ActionPanel>
              <ActionPanel.Section title={radio.title}>
                {!!playerUrl && currentRadio != null && (
                  <PlayRadioAction
                    radio={radio}
                    onActionStateChange={onPerformingActionStateChange}
                    playerUrl={playerUrl}
                  />
                )}
                <EditRadioAction radio={radio} onSuccess={refreshRadio} />
                <DeleteRadioAction
                  radio={radio}
                  onSuccess={refreshRadio}
                  onActionStateChange={onPerformingActionStateChange}
                />
              </ActionPanel.Section>
              {listManagementActions}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
