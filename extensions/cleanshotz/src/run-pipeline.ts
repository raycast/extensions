import { LaunchProps } from "@raycast/api";
import { runOnSelection } from "./cleanshotz";

export default async function Command(props: LaunchProps<{ arguments: Arguments.RunPipeline }>) {
  await runOnSelection("run-pipeline", { name: props.arguments.pipeline.trim() });
}
