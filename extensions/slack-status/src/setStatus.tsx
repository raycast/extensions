import { ActionPanel, environment, Icon, List, preferences, showToast, ToastStyle, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { slackEmojiCodeMap } from "./emojiCodes";
import {
  CurrentStatusState,
  SlackStatusPreset,
  SlackStatusPresetsListState,
  SlackStatusResponse,
  SlackStatusResponseState,
} from "./interfaces";
import { defaultStatuses } from "./defaultStatuses";
import { durationToString, keyForStatusPreset, statusExpirationText } from "./utils";
import { SlackClient } from "./slackClient";
import { CreateStatusPresetForm, EditStatusPresetForm, SetCustomStatusForm } from "./setStatusForm";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
("./setStatusForm");

// Consts

const noStatusState: CurrentStatusState = {
  icon: Icon.Message,
  title: "No status",
  isError: false,
};

// Main

export default function Command() {
  const accessToken = preferences.accessToken?.value as string;
  const slackClient = new SlackClient(accessToken);
  return <StatusesList slackClient={slackClient} />;
}

function StatusesList(props: { slackClient: SlackClient }) {
  const currentStatusResponseState = useState<SlackStatusResponse>();
  const statusPresetsListState = useStoredPresets();
  const statusPresets = statusPresetsListState[0];

  return (
    <List>
      <List.Section id="currentStatusSection" key="currentStatusSection" title="Current Status">
        <CurrentStatusItem
          slackClient={props.slackClient}
          currentStatusResponseState={currentStatusResponseState}
          statusPresetsListState={statusPresetsListState}
        />
      </List.Section>
      <List.Section id="presets" key="presets" title="Presets">
        {statusPresets.map((status, index) => (
          <SetStatusPresetListItem
            key={keyForStatusPreset(status)}
            slackClient={props.slackClient}
            statusPreset={status}
            currentStatusResponseState={currentStatusResponseState}
            statusPresetsListState={statusPresetsListState}
            presetIndex={index}
          />
        ))}
      </List.Section>
    </List>
  );
}

// Components

function CurrentStatusItem(props: {
  slackClient: SlackClient;
  currentStatusResponseState: SlackStatusResponseState;
  statusPresetsListState: SlackStatusPresetsListState;
}) {
  const [listItemState, setListItemState] = useState<CurrentStatusState>({
    title: "",
    isError: false,
  });

  const currentStatusResponse = props.currentStatusResponseState[0];

  useEffect(() => {
    if (!currentStatusResponse) {
      return;
    }
    if (currentStatusResponse?.error) {
      setListItemState({
        title: "Failed to fetch status",
        subtitle: currentStatusResponse?.error.message,
        icon: "⚠️",
        isError: true,
      });
    } else if (currentStatusResponse?.status) {
      const status = currentStatusResponse?.status;
      const subtitle = status.expiration ? statusExpirationText(status.expiration) : "";
      setListItemState({
        status: status,
        title: status.title,
        subtitle: subtitle,
        icon: slackEmojiCodeMap[status.emojiCode] ?? "💬",
        isError: false,
      });
    } else {
      setListItemState(noStatusState);
    }
  }, [currentStatusResponse]);

  useEffect(() => {
    props.slackClient.getCurrentStatus(props.currentStatusResponseState);
  }, []);

  return (
    <List.Item
      id="currentStatus"
      icon={listItemState.icon}
      title={listItemState.title}
      subtitle={listItemState.subtitle}
      actions={
        currentStatusResponse &&
        (listItemState.status ? (
          <ActionPanel>
            <ActionPanel.Section key="main">
              <ClearStatusAction
                slackClient={props.slackClient}
                currentStatusResponseState={props.currentStatusResponseState}
              />
              <SetCustomStatusAction
                slackClient={props.slackClient}
                currentStatusResponseState={props.currentStatusResponseState}
              />
            </ActionPanel.Section>
            <ActionPanel.Section key="presets">
              <CreatePresetAction statusPresetsListState={props.statusPresetsListState} />
            </ActionPanel.Section>
          </ActionPanel>
        ) : (
          <ActionPanel>
            <ActionPanel.Section key="main">
              <SetCustomStatusAction
                slackClient={props.slackClient}
                currentStatusResponseState={props.currentStatusResponseState}
              />
            </ActionPanel.Section>
            <ActionPanel.Section key="presets">
              <CreatePresetAction statusPresetsListState={props.statusPresetsListState} />
            </ActionPanel.Section>
          </ActionPanel>
        ))
      }
    />
  );
}

function SetStatusPresetListItem(props: {
  slackClient: SlackClient;
  statusPreset: SlackStatusPreset;
  currentStatusResponseState: SlackStatusResponseState;
  statusPresetsListState: SlackStatusPresetsListState;
  presetIndex: number;
}) {
  const status = props.statusPreset;
  return (
    <List.Item
      id={keyForStatusPreset(status)}
      icon={slackEmojiCodeMap[status.emojiCode] ?? "💬"}
      title={status.title}
      subtitle={durationToString(status.defaultDuration)}
      actions={
        <ActionPanel>
          <ActionPanel.Section key="main">
            <SetStatusAction
              slackClient={props.slackClient}
              statusPreset={status}
              currentStatusResponseState={props.currentStatusResponseState}
            />
            <SetStatusWithDuration
              slackClient={props.slackClient}
              statusPreset={status}
              currentStatusResponseState={props.currentStatusResponseState}
            />
          </ActionPanel.Section>
          <ActionPanel.Section key="modifications">
            <EditPresetAction statusPresetsListState={props.statusPresetsListState} index={props.presetIndex} />
            <DeletePresetAction statusPresetsListState={props.statusPresetsListState} index={props.presetIndex} />
          </ActionPanel.Section>
          <ActionPanel.Section key="global">
            <CreatePresetAction statusPresetsListState={props.statusPresetsListState} />
            <SetCustomStatusAction
              slackClient={props.slackClient}
              currentStatusResponseState={props.currentStatusResponseState}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

// Actions

function SetCustomStatusAction(props: {
  slackClient: SlackClient;
  currentStatusResponseState: SlackStatusResponseState;
}) {
  const { push } = useNavigation();
  return (
    <ActionPanel.Item
      id="setCustomStatus"
      title="Set Custom Status"
      icon={Icon.Message}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      onAction={() => {
        push(
          <SetCustomStatusForm
            slackClient={props.slackClient}
            currentStatusResponseState={props.currentStatusResponseState}
          />
        );
      }}
    />
  );
}

function ClearStatusAction({ slackClient, currentStatusResponseState }: { slackClient: SlackClient; currentStatusResponseState: SlackStatusResponseState }) {
  const clearStatus = () => {
    showAlertDialog({
      title: 'Confirm Clear Status',
      message: 'Are you sure you want to clear your status?',
      actions: [
        { title: 'Cancel' },
        { title: 'Clear', destructive: true, onAction: () => slackClient.clearStatus(currentStatusResponseState) },
      ],
    });
  };

  return (
    <ActionPanel.Item
      id="clearStatus"
      title="Clear Status"
      icon={Icon.XmarkCircle}
      onAction={clearStatus}
    />
  );
}

function SetStatusAction(props: {
  slackClient: SlackClient;
  statusPreset: SlackStatusPreset;
  currentStatusResponseState: SlackStatusResponseState;
}) {
  return (
    <ActionPanel.Item
      id="setStatus"
      title="Set Status"
      icon={Icon.Pencil}
      onAction={() => props.slackClient.setStatusFromPreset(props.statusPreset, props.currentStatusResponseState)}
    />
  );
}

function SetStatusWithDuration(props: {
  slackClient: SlackClient;
  statusPreset: SlackStatusPreset;
  currentStatusResponseState: SlackStatusResponseState;
}) {
  const titleDurationPairs: [string, number][] = [
    ["Don't clear", 0],
    ["15 minutes", 15],
    ["30 minutes", 30],
    ["45 minutes", 45],
    ["1 hour", 60],
    ["1.5 hour", 90],
    ["2 hours", 120],
    ["3 hours", 180],
  ];
  return (
    <ActionPanel.Submenu icon={Icon.Clock} title="Set Status with Duration...">
      {titleDurationPairs.map((titleDurationPair) => {
        const title = titleDurationPair[0];
        const duration = titleDurationPair[1];
        return (
          <ActionPanel.Item
            key={title}
            id={title}
            title={title}
            icon={Icon.Clock}
            onAction={() =>
              props.slackClient.setStatusFromPreset(props.statusPreset, props.currentStatusResponseState, duration)
            }
          />
        );
      })}
    </ActionPanel.Submenu>
  );
}

function DeletePresetAction(props: { statusPresetsListState: SlackStatusPresetsListState; index: number }) {
  return (
    <ActionPanel.Item
      id="deletePreset"
      title="Delete Preset"
      icon={Icon.Trash}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={() => {
        const [presets, setPresets] = props.statusPresetsListState;
        const newPresets = [...presets];
        newPresets.splice(props.index, 1);
        setPresets(newPresets);
      }}
    />
  );
}

function CreatePresetAction(props: { statusPresetsListState: SlackStatusPresetsListState }) {
  const { push, pop } = useNavigation();
  return (
    <ActionPanel.Item
      id="createPreset"
      title="Create Status Preset"
      icon={Icon.Document}
      shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
      onAction={() => {
        push(
          <CreateStatusPresetForm
            onCompletion={(preset) => {
              const [presets, setPresets] = props.statusPresetsListState;
              const newPresets = [...presets, preset];
              setPresets(newPresets);
              const emoji = slackEmojiCodeMap[preset.emojiCode] ?? "💬";
              const message = `${emoji} ${preset.title}`;
              showToast(ToastStyle.Success, "Preset created", message);
              pop();
            }}
          />
        );
      }}
    />
  );
}

function EditPresetAction(props: { statusPresetsListState: SlackStatusPresetsListState; index: number }) {
  const { push, pop } = useNavigation();
  const [presets, setPresets] = props.statusPresetsListState;
  return (
    <ActionPanel.Item
      id="editPreset"
      title="Edit Preset"
      icon={Icon.Pencil}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      onAction={() => {
        push(
          <EditStatusPresetForm
            preset={presets[props.index]}
            onCompletion={(preset) => {
              const newPresets = [...presets];
              newPresets[props.index] = preset;
              setPresets(newPresets);
              const emoji = slackEmojiCodeMap[preset.emojiCode] ?? "💬";
              const message = `${emoji} ${preset.title}`;
              showToast(ToastStyle.Success, "Preset updated", message);
              pop();
            }}
          />
        );
      }}
    />
  );
}

// Presets Storage

function useStoredPresets(): SlackStatusPresetsListState {
  const [presets, setPresets] = useState(() => {
    const stored = readStoredPresets();
    if (stored) {
      return stored;
    } else {
      return defaultStatuses;
    }
  });

  const updatePresets = (newPresets: SlackStatusPreset[]) => {
    setPresets(newPresets);
    storePresets(newPresets);
  };

  return [presets, updatePresets];
}

function storePresets(presets: SlackStatusPreset[]) {
  try {
    mkdirSync(`${environment.supportPath}`, { recursive: true });
    const path = `${environment.supportPath}/presets.json`;
    writeFileSync(path, JSON.stringify(presets));
  } catch (e) {
    console.error(e);
  }
}

function readStoredPresets(): SlackStatusPreset[] | undefined {
  try {
    const path = `${environment.supportPath}/presets.json`;
    const contents = readFileSync(path);
    const serializedValue = contents.toString();
    return JSON.parse(serializedValue) as SlackStatusPreset[];
  } catch (e) {
    return undefined;
  }
}
