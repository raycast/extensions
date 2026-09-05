import { loadTickTickAiToolRuntime } from "../bootstrap/commandBootstrap";
import { createGetTasksTool } from "./toolController";

type Input = {
  /** The smart list to read: today's tasks or the next 7 days. */
  smartProjectId: "today" | "next7Days";
};

const getTasks = createGetTasksTool({ loadRuntime: loadTickTickAiToolRuntime });

export default async function (input: Input) {
  return getTasks(input);
}
