import {
  ActionPanel,
  environment,
  Icon,
  List,
  getPreferenceValues,
  showToast,
  useNavigation,
  Action,
  Toast,
  LaunchProps,
  Clipboard,
  closeMainWindow,
  showHUD,
} from "@raycast/api";
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
import { PopToRootType } from "@raycast/api";

// Consts

const noStatusState: CurrentStatusState = {
  icon: Icon.Message,
  title: "No status",
  isError: false,
};

type LaunchContext = {
  status?: string;
  emoji?: string;
  duration?: number;
};

// Main

export default function Command(props: LaunchProps) {
  const accessToken = getPreferenceValues<{ accessToken: string }>().accessToken;
  const slackClient = new SlackClient(accessToken);
  return <StatusesList slackClient={slackClient} launchContext={(props.launchContext ?? {}) as LaunchContext} />;
}

function StatusesList(props: { slackClient: SlackClient; launchContext: LaunchContext }) {
  const currentStatusResponseState = useState<SlackStatusResponse>();
  const statusPresetsListState = useStoredPresets();
  const statusPresets = statusPresetsListState[0];

  if (props.launchContext.status || props.launchContext.emoji || props.launchContext.duration) {
    const initialValues: SlackStatusPreset = {
      title: props.launchContext.status ?? "",
      emojiCode: props.launchContext.emoji ?? ":speech_balloon:",
      defaultDuration: props.launchContext.duration ?? 0,
    };
    return (
      <SetCustomStatusForm
        slackClient={props.slackClient}
        initialValues={initialValues}
        currentStatusResponseState={currentStatusResponseState}
      />
    );
  }

  return (
    <List>
      <List.Section title="Current Status">
        <CurrentStatusItem
          slackClient={props.slackClient}
          currentStatusResponseState={currentStatusResponseState}
          statusPresetsListState={statusPresetsListState}
        />
      </List.Section>
      <List.Section title="Presets">
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
          <ActionPanel.Section>
            <CopyDeeplinkAction preset={props.statusPreset} />
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
    <Action
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

function ClearStatusAction(props: { slackClient: SlackClient; currentStatusResponseState: SlackStatusResponseState }) {
  return (
    <Action
      title="Clear Status"
      icon={Icon.XMarkCircle}
      onAction={() => props.slackClient.clearStatus(props.currentStatusResponseState)}
    />
  );
}

function SetStatusAction(props: {
  slackClient: SlackClient;
  statusPreset: SlackStatusPreset;
  currentStatusResponseState: SlackStatusResponseState;
}) {
  return (
    <Action
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
          <Action
            key={title}
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
    <Action
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
    <Action
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
              showToast({
                style: Toast.Style.Success,
                title: "Preset created",
                message: message,
              });
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
    <Action
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
              showToast({
                style: Toast.Style.Success,
                title: "Preset updated",
                message: message,
              });
              pop();
            }}
          />
        );
      }}
    />
  );
}

function CopyDeeplinkAction(props: { preset: SlackStatusPreset }) {
  return (
    <Action
      title="Copy Deeplink"
      icon={Icon.Clipboard}
      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      onAction={() => {
        const params = new URLSearchParams();
        const launchContext = {
          status: props.preset.title,
          emoji: props.preset.emojiCode,
          duration: props.preset.defaultDuration,
        };
        params.append("launchContext", JSON.stringify(launchContext));
        Clipboard.copy(`raycast://extensions/petr/slack-status/setStatus?${params}`);
        closeMainWindow({ popToRootType: PopToRootType.Immediate });
        showHUD("Copied deeplink to clipboard");
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
