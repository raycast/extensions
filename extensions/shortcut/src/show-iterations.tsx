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

        return (
          <List.Item
            title={iteration.name}
            key={iteration.id}
            subtitle={iteration.status}
            accessories={[
              {
                date: new Date(iteration.start_date),
              },
              {
                icon: statusIcon,
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
