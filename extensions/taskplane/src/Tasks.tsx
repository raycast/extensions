/* eslint-disable @typescript-eslint/no-explicit-any */
import Task from "./Task";
import axios from "axios";
import { API_URL, AuthContext, COLORS } from "./lib";
import { showToast, Toast, List, ActionPanel, Action, Icon } from "@raycast/api";
import { useState, useContext, useEffect, useCallback } from "react";

interface TasksProps {
  organizationId: string;
}

export default function Tasks({ organizationId }: TasksProps) {
  const { token, setToken } = useContext(AuthContext);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [tasks, setTasks] = useState<any[]>();

  const getTasks = useCallback(async () => {
    axios
      .get(`${API_URL}/organizations/${organizationId}/tasks`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        setTasks(res.data);
        setIsLoading(false);
      })
      .catch(() => {
        showToast(Toast.Style.Failure, "Failed to retrieve tasks");
        setIsLoading(false);
      });
  }, [organizationId]);

  useEffect(() => {
    getTasks();
  }, []);

  return (
    <List searchBarPlaceholder="Search tasks..." navigationTitle="Search tasks" isLoading={isLoading} enableFiltering>
      {tasks && (
        <List.Section title="All tasks">
          {tasks.map((task) => (
            <List.Item
              accessoryTitle={`#${task.ref}`}
              keywords={[task.id, task.ref.toString(), `#${task.ref}`]}
              icon={{
                source: task.isCompleted ? "check-circle-solid.svg" : "check-circle.svg",
                tintColor: COLORS.GREEN,
              }}
              actions={
                <ActionPanel>
                  <Action.Push
                    target={
                      <AuthContext.Provider value={{ token, setToken }}>
                        <Task refetchTasks={getTasks} task={task} organizationId={organizationId} />
                      </AuthContext.Provider>
                    }
                    title="Open Task"
                    icon={Icon.Link}
                  />
                </ActionPanel>
              }
              key={task.id}
              title={task.title}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
