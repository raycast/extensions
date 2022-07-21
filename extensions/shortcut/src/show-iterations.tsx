import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { IterationSlim } from "@useshortcut/client";
import { IterationStories } from "./components/IterationStories";
import { useIterations } from "./hooks";

const sortIterationByStartDateDesc = (a: IterationSlim, b: IterationSlim) => {
  return Date.parse(b.start_date) - Date.parse(a.start_date);
};

export default function ListIterationStories() {
  const { data: iterations, isValidating } = useIterations();

  return (
    <List isLoading={isValidating}>
      {iterations?.sort(sortIterationByStartDateDesc).map((iteration) => {
        const statusIcon: Image.ImageLike = (function (): Image.ImageLike {
          switch (iteration.status) {
            case "unstarted":
              return {
                source: Icon.Circle,
                tintColor: Color.Orange,
              };
            case "started":
              return {
                source: Icon.Circle,
                tintColor: Color.Green,
              };
            default:
            case "done":
              return {
                source: Icon.CheckCircle,
              };
          }
        })();

        const { num_stories_done, num_stories_unstarted, num_stories_started } = iteration.stats;
        const totalStories = num_stories_done + num_stories_unstarted + num_stories_started;

        return (
          <List.Item
            title={iteration.name}
            icon={Icon.Repeat}
            key={iteration.id}
            subtitle={`${totalStories} stories`}
            accessories={[
              {
                date: new Date(iteration.start_date),
                tooltip: "Start Date",
              },
              {
                icon: statusIcon,
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
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
