import { Detail } from "@raycast/api";
import { listScreenInfo } from "./utils/list";

export default function DisplayPlacer() {
  const result = listScreenInfo();
  const markdown = "";
  return <Detail markdown={markdown} />;
}
