import { loadTickTickAiToolRuntime } from "../bootstrap/commandBootstrap";
import { createGetListsTool } from "./toolController";

const getLists = createGetListsTool({ loadRuntime: loadTickTickAiToolRuntime });

export default async function () {
  return getLists();
}
