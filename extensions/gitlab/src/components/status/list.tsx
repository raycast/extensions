import { ActionPanel, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { gitlab } from "../../common";
import { Status } from "../../gitlabapi";
import { formatDate } from "../../utils";
import { useEffect, useState } from "react";
import { clearDurationText, emojiSymbol } from "./utils";
import { usePresets } from "./presets";
import {
  StatusClearCurrentAction,
  StatusPresetCreateAction,
  StatusPresetDeleteAction,
  StatusPresetEditAction,
  StatusPresetFactoryResetAction,
  StatusPresetMoveDownAction,
  StatusPresetMoveUpAction,
  StatusPresetSetAction,
  StatusPresetSetWithDurationAction,
  StatusSetCustomAction,
} from "./actions";

export default function StatusList() {
  const { data, isLoading } = useCachedPromise(() => gitlab.getUserStatus(), []);
  const [currentStatus, setCurrentStatus] = useState<Status | undefined>(data);
  useEffect(() => {
    setCurrentStatus(data);
  }, [data]);

  const { presets, setPresets } = usePresets();
  const [selectedId, setSelectedId] = useState<string>();

  return (
    <List isLoading={isLoading} selectedItemId={selectedId}>
      <List.Section title="Current Status">
        <StatusCurrentListItem
          status={currentStatus}
          presets={presets}
          setPresets={setPresets}
          setCurrentStatus={setCurrentStatus}
        />
      </List.Section>
      <List.Section title="Presets">
        {presets.map((preset, index) => (
          <StatusPresetListItem
            key={`${preset.message}_${preset.emoji}_${index}`}
            status={preset}
            presets={presets}
            setPresets={setPresets}
            index={index}
            setCurrentStatus={setCurrentStatus}
            setSelectedId={setSelectedId}
          />
        ))}
      </List.Section>
    </List>
  );
}

function StatusCurrentListItem(props: {
  status: Status | undefined;
  presets: Status[];
  setPresets: React.Dispatch<React.SetStateAction<Status[]>>;
  setCurrentStatus: React.Dispatch<React.SetStateAction<Status | undefined>>;
}) {
  let emojiIcon: string | undefined = undefined;

  let durationText: string | undefined = undefined;
  if (props.status && props.status.clear_status_at !== undefined && props.status.clear_status_at instanceof Date) {
    durationText = `Clears ${formatDate(props.status.clear_status_at)}`;
  }
  let title = "";
  if (props.status) {
    if (!props.status.emoji && !props.status.message) {
      emojiIcon = "🗨️";
      title = "No Status";
      durationText = "";
    } else {
      emojiIcon = emojiSymbol(props.status.emoji);
      title = props.status.message ? props.status.message : "";
      if (durationText === undefined) {
        durationText = "Don't clear";
      }
    }
  }
  return (
    <List.Item
      title={title}
      icon={emojiIcon}
      subtitle={durationText}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <StatusClearCurrentAction status={props.status} setCurrentStatus={props.setCurrentStatus} />
            <StatusSetCustomAction setCurrentStatus={props.setCurrentStatus} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <StatusPresetCreateAction presets={props.presets} setPresets={props.setPresets} />
            <StatusPresetFactoryResetAction setPresets={props.setPresets} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function StatusPresetListItem(props: {
  status: Status;
  presets: Status[];
  index: number;
  setPresets: React.Dispatch<React.SetStateAction<Status[]>>;
  setCurrentStatus: React.Dispatch<React.SetStateAction<Status | undefined>>;
  setSelectedId: React.Dispatch<React.SetStateAction<string | undefined>>;
}) {
  return (
    <List.Item
      id={`preset_${props.index}`}
      title={props.status.message}
      icon={emojiSymbol(props.status.emoji)}
      subtitle={clearDurationText(props.status.clear_status_after)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <StatusPresetSetAction status={props.status} setCurrentStatus={props.setCurrentStatus} />
            <StatusPresetSetWithDurationAction status={props.status} setCurrentStatus={props.setCurrentStatus} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <StatusPresetEditAction
              status={props.status}
              presets={props.presets}
              index={props.index}
              setPresets={props.setPresets}
            />
            <StatusPresetDeleteAction presets={props.presets} index={props.index} setPresets={props.setPresets} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <StatusPresetCreateAction presets={props.presets} setPresets={props.setPresets} />
            <StatusSetCustomAction setCurrentStatus={props.setCurrentStatus} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <StatusPresetMoveUpAction
              presets={props.presets}
              setPresets={props.setPresets}
              index={props.index}
              setSelectedId={props.setSelectedId}
            />
            <StatusPresetMoveDownAction
              presets={props.presets}
              setPresets={props.setPresets}
              index={props.index}
              setSelectedId={props.setSelectedId}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <StatusPresetFactoryResetAction setPresets={props.setPresets} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
