import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  showToast,
  open,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { CliMissingError, runCli, runCliPath } from "./cli";

interface Meeting {
  id: string;
  uuid: string;
  title: string;
  date: string;
  duration_seconds: number;
  app_source: string;
  has_summary: boolean;
  has_transcript: boolean;
  has_system_track: boolean;
}

const shortDate = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Format seconds as m:ss. */
function duration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function Command() {
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    runCli<Meeting[]>("list", "--limit", "20")
      .then((result) => {
        if (!cancelled) setMeetings(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof CliMissingError) {
          setMissing(true);
        } else {
          setError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function reveal(meetingId: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Locating meeting…",
    });
    try {
      const folder = await runCliPath("path", meetingId);
      if (folder) {
        await open(folder);
        toast.hide();
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "No files found for this meeting";
      }
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not reveal in Finder";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  if (missing) {
    return (
      <List>
        <List.EmptyView
          title="LokalBot CLI not found"
          description="Install LokalBot — https://github.com/stevyhacker/lokalbot/releases"
        />
      </List>
    );
  }

  return (
    <List isLoading={meetings === null && error === null}>
      {error ? (
        <List.EmptyView title="Failed to load meetings" description={error} />
      ) : meetings !== null && meetings.length === 0 ? (
        <List.EmptyView
          title="No meetings yet"
          description="Capture your first meeting with LokalBot."
        />
      ) : (
        meetings?.map((meeting) => {
          const flags = [
            meeting.has_transcript ? "T" : "",
            meeting.has_summary ? "S" : "",
          ]
            .filter(Boolean)
            .join("/");
          return (
            <List.Item
              key={meeting.uuid || meeting.id}
              title={meeting.title}
              subtitle={shortDate.format(new Date(meeting.date))}
              accessories={[
                { tag: meeting.app_source },
                ...(flags ? [{ tag: flags }] : []),
                { text: duration(meeting.duration_seconds) },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Reveal in Finder"
                    icon={Icon.Finder}
                    onAction={() => reveal(meeting.id)}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
