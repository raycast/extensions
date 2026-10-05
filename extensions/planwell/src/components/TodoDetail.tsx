import { Detail } from "@raycast/api";
import { Todo } from "../types";

interface TodoDetailProps {
  todo: Todo;
}

export function TodoDetail({ todo }: TodoDetailProps) {
  return (
    <Detail
      markdown={todo.content || "*No notes yet*"}
      navigationTitle={todo.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Todo" text={todo.name} />
          <Detail.Metadata.Label
            title="Status"
            text={todo.isCompleted ? "Completed" : "Pending"}
          />
        </Detail.Metadata>
      }
    />
  );
}
