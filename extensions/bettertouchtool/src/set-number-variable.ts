import { LaunchProps } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { setVariableImplementation } from "./utils/set-variable-implementation";

export default async function Command(props: LaunchProps<{ arguments: Arguments.SetNumberVariable }>) {
  const { variableName, variableValue, variableType } = props.arguments;

  if (!variableValue) {
    await setVariableImplementation(variableName, { type: "number" }, variableType);
    return;
  }

  // Parse and validate number
  const parsedValue = Number(variableValue);
  if (isNaN(parsedValue)) {
    await showFailureToast(`"${variableValue}" is not a valid number`, {
      title: "Invalid Number Value",
    });
    return;
  }

  await setVariableImplementation(variableName, { type: "number", value: parsedValue }, variableType);
}
