import { useNavigation } from "@raycast/api";
import { useMemo } from "react";
import ConfiguredCommand from "./components/ConfiguredCommand";
import TaskForm from "./components/TaskForm";
import { createDefaultTaskFormController } from "./lib/task-form-controller-runtime";

export default function Command() {
  return (
    <ConfiguredCommand>
      {(notePath) => <AddTaskLoop notePath={notePath} />}
    </ConfiguredCommand>
  );
}

function AddTaskLoop({ notePath }: { notePath: string }) {
  const { pop } = useNavigation();
  const controller = useMemo(
    () =>
      createDefaultTaskFormController(notePath, {
        pop,
        afterSaveImpl: () => undefined,
      }),
    [notePath, pop],
  );

  return <TaskForm notePath={notePath} controller={controller} resetOnSave />;
}
