import { ActionPanel, Icon, List, preferences, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { slackEmojiCodeMap } from "./emojiCodes";
import { CurrentStatusState, SlackStatusPreset, SlackStatusResponse, SlackStatusResponseState } from "./interfaces";
import { defaultStatuses } from "./defaultStatuses";
import { durationToString, keyForStatusPreset, statusExpirationText } from "./utils";
import { SlackClient } from "./slackClient";
import CustomStatusForm from "./setStatusForm";

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
  return (
    <List>
      <List.Section id="currentStatusSection" key="currentStatusSection" title="Current Status">
        <CurrentStatusItem slackClient={props.slackClient} currentStatusResponseState={currentStatusResponseState} />
      </List.Section>
      <List.Section id="presets" key="presets" title="Presets">
        {defaultStatuses.map((status) => (
          <SetStatusPresetListItem
            key={keyForStatusPreset(status)}
            slackClient={props.slackClient}
            statusPreset={status}
            currentStatusResponseState={currentStatusResponseState}
          />
        ))}
      </List.Section>
    </List>
  );
}

// Components

function CurrentStatusItem(props: { slackClient: SlackClient; currentStatusResponseState: SlackStatusResponseState }) {
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
            <ClearStatusAction
              slackClient={props.slackClient}
              currentStatusResponseState={props.currentStatusResponseState}
            />
            <SetCustomStatusAction
              slackClient={props.slackClient}
              currentStatusResponseState={props.currentStatusResponseState}
            />
          </ActionPanel>
        ) : (
          <ActionPanel>
            <SetCustomStatusAction
              slackClient={props.slackClient}
              currentStatusResponseState={props.currentStatusResponseState}
            />
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
          <SetStatusAction
            slackClient={props.slackClient}
            statusPreset={status}
            currentStatusResponseState={props.currentStatusResponseState}
          />
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
      icon={Icon.Pencil}
      onAction={() => {
        push(
          <CustomStatusForm
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
    <ActionPanel.Item
      id="clearStatus"
      title="Clear Status"
      icon={Icon.XmarkCircle}
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
    <ActionPanel.Item
      id="setStatus"
      title="Set Status"
      icon={Icon.Pencil}
      onAction={() => props.slackClient.setStatusFromPreset(props.statusPreset, props.currentStatusResponseState)}
    />
  );
}
