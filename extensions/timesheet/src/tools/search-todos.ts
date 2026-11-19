import { Icon } from "@raycast/api";
import { getTodos } from "../api";
import { MENTION_LIMIT, todoUri, type MentionItem } from "../mentions";

type Input = {
  /** What the user typed after choosing the search, empty for the default list. */
  query: string;
};

// Open todos for the AI Chat `@` menu, matched on name and description by the server.
export default async function (input: Input): Promise<MentionItem[]> {
  const todos = await getTodos({
    status: "open",
    search: input.query.trim() || undefined,
  });

  return todos.slice(0, MENTION_LIMIT).map((todo) => ({
    title: todo.name,
    uri: todoUri(todo.id),
    description: todo.project?.title,
    icon: Icon.Circle,
  }));
}
