import { Action, ActionPanel, Detail, Icon, List, Toast, popToRoot, showHUD, showToast } from "@raycast/api";
import { useTimersQuery } from "./graphql/timers.hook";
import { apolloClient } from "./lib/apolloClient";
import { parseISO } from "date-fns";
import { useStopTimeSpanMutation } from "./graphql/stopTimeSpan.hook";
import { useEffect, useState } from "react";
import { DefaultActions } from "./components/DefaultActions";
import { Authenticated } from "./components/Authenticated";
import { Timer } from "./lib/types";
import TrackCommand from "./trackCommand";
import { formatTimerRuntime, getISOTimestamp } from "./lib/dateUtils";
import { useTagsQuery } from "./graphql/tags.hook";
import { TagDefinition } from "./graphql/types";

const TimerItem = ({ timer, tags, onAction }: { timer: Timer; onAction: VoidFunction; tags: TagDefinition[] }) => {
  const hasTags = timer.tags?.length !== undefined && timer.tags.length > 0;
  const hasNote = timer.note.length > 0;
  const title = timer.tags?.map((tag) => `${tag.key}:${tag.value}`)?.join(", ");
  const [distance, setDistance] = useState(formatTimerRuntime(parseISO(timer.start)));
  const shortNote = hasNote ? timer.note.substring(0, 20) : "";

  useEffect(() => {
    const interval = setInterval(() => {
      setDistance(formatTimerRuntime(parseISO(timer.start)));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <List.Item
      title={hasNote ? shortNote : hasTags && title ? title : "Unnamed Timer"}
      subtitle={distance}
      icon={Icon.Stopwatch}
      actions={
        <ActionPanel>
          <Action style={Action.Style.Destructive} title="Stop" onAction={onAction} />
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          markdown={`# ${distance}`}
          metadata={
            <Detail.Metadata>
              <Detail.Metadata.Label
                title="Started at"
                text={parseISO(timer.start).toLocaleString()}
                icon={Icon.Clock}
              />
              {hasNote && <Detail.Metadata.Label title="Note" text={timer.note} icon={Icon.Paragraph} />}
              {hasTags && (
                <Detail.Metadata.TagList title="Tags">
                  {timer.tags?.map((tag) => {
                    const id = `${tag.key}:${tag.value}`;

                    return (
                      <Detail.Metadata.TagList.Item
                        key={id}
                        text={id}
                        color={tags.find((tagDefinition) => tagDefinition.key === tag.key)?.color}
                      />
                    );
                  })}
                </Detail.Metadata.TagList>
              )}
            </Detail.Metadata>
          }
        />
      }
    />
  );
};

export default function StopCommand() {
  const [loggedIn, setLoggedIn] = useState(false);
  const { data: timers, loading: timersLoading } = useTimersQuery({
    client: apolloClient,
    skip: !loggedIn,
  });
  const { data: tags, loading: tagsLoading } = useTagsQuery({
    client: apolloClient,
    skip: !loggedIn,
  });

  const [stopTimeSpan] = useStopTimeSpanMutation({ client: apolloClient });

  const stopTimer = async (id: number) => {
    try {
      await stopTimeSpan({
        variables: {
          id,
          end: getISOTimestamp(),
        },
      });
      showHUD("Timer stopped");
      popToRoot();
    } catch (e: any) {
      showToast(Toast.Style.Failure, `Failed to stop timer: ${e.message}`);
    }
  };

  return (
    <Authenticated setLoggedIn={setLoggedIn}>
      <List
        filtering={true}
        navigationTitle="Search timers"
        searchBarPlaceholder="Search for a running timer"
        isShowingDetail={
          !timersLoading && !tagsLoading && timers?.timers?.length !== undefined && timers.timers.length > 0
        }
        actions={
          <ActionPanel>
            <Action.Push target={<TrackCommand />} title="Start Timer" icon={Icon.Play} />
            <DefaultActions />
          </ActionPanel>
        }
      >
        {tags?.tags &&
          timers?.timers?.map((timer) => (
            <TimerItem
              key={timer.id}
              timer={timer}
              onAction={() => stopTimer(timer.id)}
              tags={tags.tags?.filter((tag): tag is TagDefinition => !!tag) ?? []}
            />
          ))}
      </List>
    </Authenticated>
  );
}
