import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useState } from "react";
import { useDebounce } from "./hooks/useDebounce";
import useInterpreter from "./hooks/useInterpreter";
import TaskForm from "./task-form";
import { TaskPlanDetails } from "./types/plan";
import { addMinutes } from "date-fns";

export type ListType = {
  uuid: string;
  title: string;
  interpreterData: TaskPlanDetails;
};

export default function Command() {
  const { push } = useNavigation();
  const { sendToInterpreter } = useInterpreter();
  const [list, setList] = useState<ListType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const _onChangeDebounced = async (text: string) => {
    try {
      setLoading(true);
      if (text !== "") {
        const response = await sendToInterpreter<TaskPlanDetails>("task", text);

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

  const onChangeDebounced = useDebounce(_onChangeDebounced, 2000);

  return (
    <List
      searchBarPlaceholder="Type in your task, duration, & due date…"
      isLoading={loading}
      onSearchTextChange={onChangeDebounced}
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
              : `"work task Prep board slides (4h, due: 10am Monday, notbefore: tomorrow)"
                 "personal task Do the dishes (15min, due: today, notbefore: 12pm)"`
          }
          title="Quickly create a Task"
        />
      ) : (
        list.map((item) => (
          <List.Item
            key={item.uuid}
            title={item.title}
            icon={Icon.LightBulb}
            actions={
              <ActionPanel>
                <Action
                  title={item.title}
                  onAction={() => {
                    push(
                      <TaskForm
                        interpreter={{
                          due: item.interpreterData.due
                            ? new Date(item.interpreterData.due)
                            : addMinutes(new Date(), 5),
                          durationTimeChunk: item.interpreterData.durationTimeChunks,
                          snoozeUntil: item.interpreterData.snoozeUntil
                            ? new Date(item.interpreterData.snoozeUntil)
                            : new Date(),
                        }}
                        title={item.title}
                      />
                    );
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
