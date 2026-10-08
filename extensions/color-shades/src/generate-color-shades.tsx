import { LaunchProps } from "@raycast/api";
import { GenerateColorShadesGrid } from "./components/generate-color-shades/generate-color-shades-grid.component";

export default (props: LaunchProps<{ arguments: { color: string } }>) => (
  <GenerateColorShadesGrid color={props.arguments.color} />
);
