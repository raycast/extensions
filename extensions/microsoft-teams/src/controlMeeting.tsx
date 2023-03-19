import { Action, ActionPanel, Grid } from "@raycast/api";
import {
  MeetingAction,
  MeetingClient,
  MeetingPermission,
  MeetingPermissions,
  MeetingState,
  SingleMeetingState,
  UpdateMessage,
} from "./teams/meetingClient";
import { useEffect, useState } from "react";

interface State {
  state: MeetingState;
  permissions: MeetingPermissions;
}

interface Item {
  content: [active: string, inactive?: string];
  title: string;
  keywords?: string[];
  action: MeetingAction;
  state?: SingleMeetingState;
  permission: MeetingPermission;
}

const items: Item[] = [
  {
    content: ["❌", "🎤"],
    title: "Microphone",
    keywords: ["microphone", "mute"],
    action: "toggle-mute",
    state: "isMuted",
    permission: "canToggleMute",
  },
  {
    content: ["📷", "❌"],
    title: "Camera",
    action: "toggle-video",
    state: "isCameraOn",
    permission: "canToggleVideo",
  },
  {
    content: ["🌁", "❌"],
    title: "Background blur",
    action: "toggle-background-blur",
    state: "isBackgroundBlurred",
    permission: "canToggleBlur",
  },
  {
    content: ["📞"],
    title: "Leave Call",
    action: "leave-call",
    permission: "canLeave",
  },
  {
    content: ["✋", "❌"],
    title: "Raise Hand",
    action: "toggle-hand",
    state: "isHandRaised",
    permission: "canToggleHand",
  },
  {
    content: ["😮"],
    title: "Wow",
    action: "react-wow",
    permission: "canReact",
  },
  {
    content: ["👏"],
    title: "Applause",
    action: "react-applause",
    permission: "canReact",
  },
  {
    content: ["❤️"],
    title: "Love",
    action: "react-love",
    permission: "canReact",
  },
  {
    content: ["👍"],
    title: "Like",
    action: "react-like",
    permission: "canReact",
  },
  {
    content: ["😆"],
    title: "Laugh",
    action: "react-laugh",
    permission: "canReact",
  },
];

const isItemEnabled = (item: Item, state: State) => state.state.isInMeeting && state.permissions[item.permission];
const itemContent = (item: Item, state: State) => ((item.state && !state.state[item.state]) ? item.content[1] : item.content[0]);

function GridItem({ item, meetingState, client }: { item: Item; meetingState: State; client?: MeetingClient }) {
  return (
    <Grid.Item
      key={item.content[0]}
      content={itemContent(item, meetingState) ?? ""}
      title={item.title}
      keywords={item.keywords}
      actions={
        <ActionPanel>
          <Action title={"Execute"} onAction={() => client?.sendAction(item.action)} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [client, setClient] = useState<MeetingClient>();
  const [meetingState, setMeetingState] = useState<State>();
  const updateState = (msg: UpdateMessage) =>
    setMeetingState({
      state: msg.meetingUpdate.meetingState,
      permissions: msg.meetingUpdate.meetingPermissions,
    });
  const availableItems = meetingState ? items.filter((item) => isItemEnabled(item, meetingState)) : [];
  const gridContent =
    meetingState && availableItems.length > 0 ? (
      availableItems.map((item) => (
        <GridItem key={item.action} item={item} meetingState={meetingState} client={client} />
      ))
    ) : (
      <Grid.EmptyView title="Looks like there's no meeting in progress …" />
    );

  useEffect(() => {
    const c: MeetingClient = new MeetingClient(() => {
      setClient(c);
      c.requestMeetingState();
    }, updateState);
    return () => c.close();
  }, []);

  return (
    <Grid isLoading={!meetingState} inset={Grid.Inset.Large}>
      {gridContent}
    </Grid>
  );
}
