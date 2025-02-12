import { Action, ActionPanel, Grid, Image } from "@raycast/api";
import {
  MeetingAction,
  MeetingClient,
  MeetingPermission,
  MeetingPermissions,
  MeetingState,
  SingleMeetingState,
  UpdateMessage,
  meetingClientFromPrefs,
} from "./teams/meetingClient";
import { useEffect, useState } from "react";

interface State {
  state: MeetingState;
  permissions: MeetingPermissions;
}

const emptyState: State = {
  state: {
    isBackgroundBlurred: false,
    isCameraOn: false,
    isHandRaised: false,
    isMuted: false,
    isInMeeting: false,
    isRecordingOn: false,
  },
  permissions: {
    canLeave: false,
    canReact: false,
    canStopSharing: false,
    canToggleBlur: false,
    canToggleChat: false,
    canToggleHand: false,
    canToggleMute: false,
    canToggleRecord: false,
    canToggleShareTray: false,
    canToggleVideo: false,
  },
};

interface Item {
  action: MeetingAction;
  icon: string;
  iconInactive?: string;
  title: string;
  keywords?: string[];
  state?: SingleMeetingState;
  permission: MeetingPermission;
}

interface Section {
  title: string;
  items: Item[];
}

const sections: Section[] = [
  {
    title: "Actions",
    items: [
      {
        action: "toggle-mute",
        icon: "action-mic-inactive.png",
        iconInactive: "action-mic-active.png",
        title: "Microphone",
        keywords: ["mute", "unmute"],
        state: "isMuted",
        permission: "canToggleMute",
      },
      {
        action: "toggle-video",
        icon: "action-video-active.png",
        iconInactive: "action-video-inactive.png",
        title: "Camera",
        keywords: ["video"],
        state: "isCameraOn",
        permission: "canToggleVideo",
      },
      {
        action: "toggle-background-blur",
        icon: "action-background-blur-active.png",
        iconInactive: "action-background-blur-inactive.png",
        title: "Background Blur",
        state: "isBackgroundBlurred",
        permission: "canToggleBlur",
      },
      {
        action: "leave-call",
        icon: "action-leave-call.png",
        title: "Leave Call",
        permission: "canLeave",
      },
    ],
  },
  {
    title: "Reactions",
    items: [
      {
        action: "toggle-hand",
        icon: "action-raise-hand-active.png",
        iconInactive: "action-raise-hand-inactive.png",
        title: "Raise Hand",
        state: "isHandRaised",
        permission: "canToggleHand",
      },
      {
        action: "react-like",
        icon: "action-react-like.png",
        title: "Like",
        keywords: ["thumbs", "thumb", "up"],
        permission: "canReact",
      },
      {
        action: "react-love",
        icon: "action-react-love.png",
        title: "Love",
        keywords: ["heart"],
        permission: "canReact",
      },
      {
        action: "react-applause",
        icon: "action-react-applause.png",
        title: "Applause",
        permission: "canReact",
      },
      {
        action: "react-laugh",
        icon: "action-react-laugh.png",
        title: "Laugh",
        keywords: ["lol"],
        permission: "canReact",
      },
      {
        action: "react-wow",
        icon: "action-react-wow.png",
        title: "Wow",
        keywords: ["oh", "omg"],
        permission: "canReact",
      },
    ],
  },
];
const allItems = sections.map((section) => section.items).flat();

const isItemEnabled = (item: Item, state: State) =>
  (state.state.isInMeeting || state.permissions.canPair) && state.permissions[item.permission];
const itemContent = (item: Item, state: State): Image.ImageLike => {
  const iconName = item.state && !state.state[item.state] && item.iconInactive ? item.iconInactive : item.icon;
  return { source: iconName };
};

function GridItem({ item, meetingState, client }: { item: Item; meetingState: State; client?: MeetingClient }) {
  return (
    <Grid.Item
      content={itemContent(item, meetingState)}
      keywords={[item.title, ...(item.keywords ?? [])]}
      actions={
        <ActionPanel>
          <Action title={"Execute"} onAction={() => client?.sendAction(item.action)} />
        </ActionPanel>
      }
    />
  );
}

function Section({ section, meetingState, client }: { section: Section; meetingState: State; client?: MeetingClient }) {
  const availableItems = section.items.filter((item) => isItemEnabled(item, meetingState));
  return availableItems.length > 0 ? (
    <Grid.Section title={section.title}>
      {section.items
        .filter((item) => isItemEnabled(item, meetingState))
        .map((item) => (
          <GridItem key={item.action} item={item} meetingState={meetingState} client={client} />
        ))}
    </Grid.Section>
  ) : (
    <></>
  );
}

export default function Command() {
  const [client, setClient] = useState<MeetingClient>();
  const [meetingState, setMeetingState] = useState<State>();
  const updateState = (msg: UpdateMessage) =>
    setMeetingState({
      state: msg.meetingUpdate.meetingState ?? emptyState.state, // <<-- Use the empty state if undefined
      permissions: msg.meetingUpdate.meetingPermissions,
    });
  const availableItems = meetingState ? allItems.filter((item) => isItemEnabled(item, meetingState)) : [];
  const gridContent =
    meetingState && availableItems.length > 0 ? (
      sections.map((section) => (
        <Section key={section.title} section={section} meetingState={meetingState} client={client} />
      ))
    ) : (
      <Grid.EmptyView
        icon={{ source: "empty-view.svg" }}
        title="No Meeting"
        description="Looks like there's no meeting in progress …"
      />
    );

  useEffect(() => {
    const c: MeetingClient = meetingClientFromPrefs({
      onConnected: () => {
        setClient(c);
        c.requestMeetingState();
      },
      onMessage: updateState,
      onError: () => {
        setMeetingState(emptyState);
      },
    });
    return () => c.close();
  }, []);

  return (
    <Grid isLoading={!meetingState} columns={6} inset={Grid.Inset.Zero}>
      {gridContent}
    </Grid>
  );
}
