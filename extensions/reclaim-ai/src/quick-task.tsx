import "./initSentry";

import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useState } from "react";
import useInterpreter from "./hooks/useInterpreter";
import TaskForm from "./task-form";
import { TaskPlanDetails } from "./types/plan";
import { withRAIErrorBoundary } from "./components/RAIErrorBoundary";

export type ListType = {
  uuid: string;
  title: string;
  interpreterData: TaskPlanDetails;
};

function Command() {
  const { push } = useNavigation();
  const { sendToInterpreter } = useInterpreter();

  const [query, setQuery] = useState<string>("");
  const [list, setList] = useState<ListType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const onAskTaskCreation = async () => {
    try {
      setLoading(true);
      if (query !== "") {
        const response = await sendToInterpreter<TaskPlanDetails>("task", query);

        if (response) {
          setList(
            response.map((item) => ({
              uuid: item.id,
              title: item.planDetails.title,
              interpreterData: item.planDetails,
            }))
          );
        }
      }
    } catch (error) {
      console.error("Error while creating task", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <List
      searchBarPlaceholder="Type in your task, duration, & due date…"
      isLoading={loading}
      onSearchTextChange={setQuery}
      actions={
        <ActionPanel>
          <Action title="Create Task" onAction={onAskTaskCreation} />
        </ActionPanel>
      }
    >
      {list.length === 0 ? (
        <List.EmptyView
          icon={{
            source: {
              light:
                "https://uploads-ssl.webflow.com/5ec848ec2b50b6cfae06f6cc/64ad8af97797f06482ba8f43_task-icon-black.png",
              dark: "https://uploads-ssl.webflow.com/5ec848ec2b50b6cfae06f6cc/64ad8af9581c1795283c0a65_task-icon-white.png",
            },
          }}
          description={
            loading
              ? `Creating Task...`
              : `"work task Prep board slides (for 4h, by 10am Monday, snooze 1 hour)"\n"personal task Do the dishes (for 15min, by 8pm, snooze 12pm)"`
          }
          title="Quickly create a Task"
        />
      ) : (
        list.map((item) => (
          <List.Item
            key={item.uuid}
            title={item.title}
            icon={Icon.CheckCircle}
            actions={
              <ActionPanel>
                <Action
                  title={`Create: ${item.title}`}
                  onAction={() => {
                    push(<TaskForm interpreter={item.interpreterData} title={item.title} />);
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

export default withRAIErrorBoundary(Command);
