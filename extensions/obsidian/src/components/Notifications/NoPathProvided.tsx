import { Detail } from "@raycast/api";

export function NoPathProvided() {
  const text = "# No path provided\n\n Please set the path to the note you wish to append to.";
  return <Detail markdown={text} />;
}
