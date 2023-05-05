import { Action, Icon } from "@raycast/api";
import { shortcut } from "../helpers/shortcut";
import { TimeEntry, TodoGroup, TodoSourceId } from "../types";
import { CreateTodoForm } from "./CreateTodoForm";

export default function CreateTodoAction({
  isFromTodayList,
  tieredTodoGroups,
  todoTags,
  revalidateTodos,
  initialTitle,
  resetList,
  alsoStartTimer,
  revalidateTimeEntries,
}: {
  isFromTodayList: boolean;
  tieredTodoGroups: Map<TodoSourceId, TodoGroup[]> | undefined;
  todoTags: Map<TodoSourceId, Map<string, string>> | undefined;
  revalidateTodos: (sourceId?: TodoSourceId) => Promise<void>;
  initialTitle?: string;
  resetList?: () => void;
  alsoStartTimer?: boolean;
  revalidateTimeEntries?: (() => Promise<TimeEntry[]>) | (() => void);
}): JSX.Element {
  return (
    <Action.Push
      icon={Icon.PlusCircleFilled}
      title={"Create To-Do" + (alsoStartTimer ? " & Start Timer" : "")}
      shortcut={shortcut.createTodo}
      target={
        <CreateTodoForm
          isFromTodayList={isFromTodayList}
          initialTitle={initialTitle}
          tieredTodoGroups={tieredTodoGroups}
          todoTags={todoTags}
          revalidateTodos={revalidateTodos}
          revalidateTimeEntries={revalidateTimeEntries}
          resetList={resetList}
        />
      }
    />
  );
}
