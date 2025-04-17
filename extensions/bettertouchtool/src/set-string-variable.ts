import { LaunchProps } from "@raycast/api";
import { setVariableImplementation } from "./utils/set-variable-implementation";

export default async function Command(props: LaunchProps<{ arguments: Arguments.SetStringVariable }>) {
  const { variableName, variableValue, variableType } = props.arguments;
  await setVariableImplementation(variableName, { type: "string", value: variableValue }, variableType);
}
