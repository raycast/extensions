import { LaunchProps } from "@raycast/api";
import { transform } from "./run";

export default (props: LaunchProps<{ arguments: { instruction: string } }>) =>
  transform(`Apply this instruction to the text: ${props.arguments.instruction}.`);
