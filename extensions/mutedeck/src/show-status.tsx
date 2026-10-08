import { Action, ActionPanel, Alert, Grid, Icon, Keyboard, confirmAlert, open } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import {
  MuteDeckOffline,
  MuteDeckStatus,
  StateValue,
  Toggleable,
  bringToFront,
  controlLabel,
  getPreferences,
  getStatus,
  leaveMeeting,
  muteLabel,
  onOffLabel,
} from "./mutedeck";
import { confirmWhilePresenting, toggleAndWait } from "./run-toggle";
import { tileIcon } from "./tiles";

const REFRESH_MS = 1000;

export default function MeetingDeck() {
  const {
    data: status,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(getStatus, [], {
    keepPreviousData: true,
  });

  useEffect(() => {
    const timer = setInterval(revalidate, REFRESH_MS);
    return () => clearInterval(timer);
  }, [revalidate]);

  const offline = error instanceof MuteDeckOffline && !status;
  const inCall = status?.call === "active";
  const title = !status
    ? "MuteDeck"
    : inCall
      ? `MuteDeck — In ${controlLabel(status.control)} call`
      : "MuteDeck — No active call";

  async function run(action: () => Promise<void>, failure: string) {
    try {
      await action();
      revalidate();
    } catch (e) {
      showFailureToast(e, { title: failure });
    }
  }

  async function guardedToggle(what: Toggleable, failure: string) {
    if (!status) {
      return;
    }
    if (!(await confirmWhilePresenting(what, status))) {
      return;
    }
    // Wait for MuteDeck to report the flipped state before refreshing, so the
    // tile doesn't briefly show the pre-toggle state (the status API lags a
    // moment behind an action).
    await run(async () => {
      await toggleAndWait(what, status[what]);
    }, failure);
  }

  async function confirmLeave() {
    const confirmed =
      !getPreferences().confirmLeave ||
      (await confirmAlert({
        title: "Leave Meeting?",
        message: "MuteDeck will leave the current meeting.",
        icon: Icon.Logout,
        primaryAction: { title: "Leave", style: Alert.ActionStyle.Destructive },
      }));
    if (confirmed) {
      await run(leaveMeeting, "Couldn't leave the meeting");
    }
  }

  if (offline) {
    return (
      <Grid navigationTitle="MuteDeck">
        <Grid.EmptyView
          icon={Icon.Plug}
          title="MuteDeck isn't running"
          description="Start MuteDeck to control your meetings from Raycast."
          actions={
            <ActionPanel>
              {/* eslint-disable-next-line @raycast/prefer-title-case -- MuteDeck is a brand name */}
              <Action title="Open MuteDeck" icon={Icon.AppWindow} onAction={() => open("/Applications/MuteDeck.app")} />
              {/* eslint-disable-next-line @raycast/prefer-title-case -- MuteDeck is a brand name */}
              <Action.OpenInBrowser title="Get MuteDeck" url="https://mutedeck.com/downloads" />
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      </Grid>
    );
  }

  return (
    <Grid columns={4} inset={Grid.Inset.Small} isLoading={isLoading} navigationTitle={title}>
      <Grid.Section title={inCall && status ? `In a ${controlLabel(status.control)} call` : "Controls"}>
        <ControlTile
          status={status}
          kind="mute"
          title="Microphone"
          label={muteLabel}
          onToggle={() => guardedToggle("mute", "Couldn't toggle the microphone")}
          revalidate={revalidate}
        />
        <ControlTile
          status={status}
          kind="video"
          title="Camera"
          label={(v) => (v === "active" ? "Cam on" : v === "inactive" ? "Cam off" : onOffLabel(v))}
          onToggle={() => guardedToggle("video", "Couldn't toggle the camera")}
          revalidate={revalidate}
        />
        <ControlTile
          status={status}
          kind="share"
          title="Screen Share"
          label={(v) => (v === "active" ? "Sharing" : v === "inactive" ? "Not sharing" : onOffLabel(v))}
          onToggle={() => guardedToggle("share", "Couldn't toggle screen sharing")}
          revalidate={revalidate}
        />
        <ControlTile
          status={status}
          kind="record"
          title="Recording"
          label={(v) => (v === "active" ? "Recording" : v === "inactive" ? "Not recording" : onOffLabel(v))}
          onToggle={() => guardedToggle("record", "Couldn't toggle recording")}
          revalidate={revalidate}
        />
      </Grid.Section>
      <Grid.Section title="Meeting">
        <Grid.Item
          content={tileIcon("leave", inCall ? "active" : "disabled")}
          title="Leave Meeting"
          subtitle={inCall ? "In call" : "No call"}
          actions={
            <ActionPanel>
              {inCall && (
                <Action
                  title="Leave Meeting"
                  icon={Icon.Logout}
                  style={Action.Style.Destructive}
                  onAction={confirmLeave}
                />
              )}
              <RefreshAction revalidate={revalidate} />
            </ActionPanel>
          }
        />
        <Grid.Item
          content={tileIcon("front", "active")}
          title="Bring to Front"
          subtitle={status ? controlLabel(status.control) : undefined}
          actions={
            <ActionPanel>
              <Action
                title="Bring Call to Front"
                icon={Icon.AppWindow}
                onAction={() => run(bringToFront, "Couldn't reach MuteDeck")}
              />
              <RefreshAction revalidate={revalidate} />
            </ActionPanel>
          }
        />
      </Grid.Section>
    </Grid>
  );
}

function ControlTile(props: {
  status: MuteDeckStatus | undefined;
  kind: Toggleable;
  title: string;
  label: (v: StateValue) => string;
  onToggle: () => Promise<void>;
  revalidate: () => void;
}) {
  const state = props.status?.[props.kind] ?? "";
  const disabled = state === "disabled" || state === "";
  return (
    <Grid.Item
      content={tileIcon(props.kind, state)}
      title={props.title}
      subtitle={props.label(state)}
      actions={
        <ActionPanel>
          {!disabled && <Action title={`Toggle ${props.title}`} icon={Icon.Switch} onAction={props.onToggle} />}
          <RefreshAction revalidate={props.revalidate} />
        </ActionPanel>
      }
    />
  );
}

function RefreshAction(props: { revalidate: () => void }) {
  return (
    <Action
      title="Refresh Status"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={props.revalidate}
    />
  );
}
