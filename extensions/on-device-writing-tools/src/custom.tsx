import { LaunchProps } from "@raycast/api";
import { transform } from "./run";

export default (props: LaunchProps<{ arguments: Arguments.Custom }>) =>
  transform(`Apply this instruction to the text: ${props.arguments.instruction}.`, { keepLanguage: false });
