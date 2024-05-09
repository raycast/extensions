import { getData } from "./functions";
import { ToolList } from "./components/ToolList";
import { Data, Environment, Tool } from "./types";

const data: Data = getData();
const tools: Tool[] = data.tools;
const environments: Environment[] = data.environments;

export default function Command() {
  return (
    <ToolList tools={tools} environments={environments} />
  );
}


