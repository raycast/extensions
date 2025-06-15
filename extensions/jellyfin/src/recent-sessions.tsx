import { ReactNode, useEffect, useState } from "react";
import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { getErrorMessage } from "./utils/errors";
import { HelpError, Session, fetchRecentSessions, signalSessionCommand } from "./utils/jellyfinApi";
import ErrorDetailView from "./components/ErrorDetailView";
import { editToast } from "./utils/utils";

function SessionListItem({ session, refresh }: { session: Session; refresh: () => void }): JSX.Element {
  let icon = session.NowPlayingItem
    ? { source: Icon.Play, tintColor: Color.Green }
    : { source: Icon.Stop, tintColor: Color.SecondaryText };
  if (session.PlayState.IsPaused) {
    icon = { source: Icon.PauseFilled, tintColor: Color.Orange };
  }

  let subtitle = "";
  if (session.NowPlayingItem) {
    const playing = session.NowPlayingItem;
    subtitle = `${playing.Name} (${playing.ProductionYear}) ${Math.round(playing.CommunityRating * 100) / 100}★`;
  }
  const accessoires: List.Item.Accessory[] = [
    {
      tag: {
        value: `${session.Client} ${session.ApplicationVersion}`,
        color: Color.Green,
      },
    },
    {
      tag: {
        value: session.DeviceName,
        color: Color.SecondaryText,
      },
    },
  ];
  if (session.PlayState.IsMuted) {
    accessoires.push({ icon: Icon.SpeakerOff });
  }
  accessoires.push({ text: session.RemoteEndPoint });
  if (session.NowPlayingItem?.Type == "Episode" && session.NowPlayingItem.SeriesName) {
    accessoires.unshift({ text: session.NowPlayingItem.SeriesName });
  }

  const actions: ReactNode[] = [];
  for (const command of session.SupportedCommands) {
    actions.push(
      <Action
        title={command}
        icon={Icon.Circle}
        onAction={async () => {
          const toast = await showToast({
            title: command,
            message: `Sending to ${session.UserName}`,
            style: Toast.Style.Animated,
          });
          try {
            await signalSessionCommand(session.Id, command);
            editToast(toast, `Successfully sent ${command} to ${session.UserName}`, Toast.Style.Success);
            refresh();
          } catch (e) {
            editToast(toast, getErrorMessage(e), Toast.Style.Failure);
          }
        }}
      />
    );
  }

  return (
    <List.Item
      title={session.UserName ?? "unknown"}
      icon={icon}
      subtitle={subtitle}
      accessories={accessoires}
      actions={<ActionPanel title="Session Action">{...actions}</ActionPanel>}
    />
  );
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState<string>("");

  async function refresh() {
    try {
      const newSessions = await fetchRecentSessions();
      setSessions(newSessions);
    } catch (e) {
      if (e instanceof HelpError) {
        setError(e.helpMessage);
      }
      showToast({ title: "Error", message: getErrorMessage(e), style: Toast.Style.Failure });
    }
  }

  function refreshLoading() {
    setIsLoading(true);
    refresh().then(() => setIsLoading(false));
  }

  useEffect(() => {
    refreshLoading();
    const interval = setInterval(() => {
      refreshLoading();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ErrorDetailView errorMessage={error}>
      <List isLoading={isLoading}>
        {sessions.map((session, sessionIndex) => (
          <SessionListItem key={sessionIndex} session={session} refresh={refreshLoading} />
        ))}
        <List.EmptyView title="No Recent Sessions found on Jellyfin" />
      </List>
    </ErrorDetailView>
  );
}
