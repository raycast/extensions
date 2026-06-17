import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { IterationStories } from "./components/IterationStories";
import { getIterationProgressColor, sortIterationByStartDateDesc } from "./helpers/iterationHelper";
import { useIterations } from "./hooks";

export default function ListIterationStories() {
  const { data: iterations, isLoading, error } = useIterations();

  return (
    <List isLoading={isLoading && !error}>
      {error && <List.EmptyView title="Error" description={error.message} />}

      {!error &&
        iterations?.sort(sortIterationByStartDateDesc).map((iteration) => {
          const { num_stories_done, num_stories_unstarted, num_stories_started } = iteration.stats;
          const totalStories = num_stories_done + num_stories_unstarted + num_stories_started;
          const progress = num_stories_done / totalStories;

          const iterationDates = `${new Date(iteration.start_date).toLocaleDateString()} - ${new Date(
            iteration.end_date
          ).toLocaleDateString()}`;

          return (
            <List.Item
              title={iteration.name}
              icon={Icon.Repeat}
              key={iteration.id}
              subtitle={`${totalStories} stories`}
              accessories={[
                {
                  text: iterationDates,
                  tooltip: "Dates",
                },
                {
                  icon: {
                    source: getProgressIcon(progress, undefined, { backgroundOpacity: 0.5 }),
                    tintColor: getIterationProgressColor(iteration),
                  },
                  tooltip: iteration.status,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    target={<IterationStories iterationId={iteration.id} />}
                    title="Open Stories"
                    icon={Icon.List}
                  />
                  <Action.OpenInBrowser url={iteration.app_url} />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
