import { LaunchProps, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export default function Command(props: LaunchProps<{ arguments: Arguments.ConvertFromMgDlToMmolL }>) {
  if (!Number.isInteger(props.arguments.value)) {
    showFailureToast("Please enter a valid blood sugar value in mg/dL (whole number)");
  }

  const value = Number(props.arguments.value) / 18.018;
  const rounded = Math.floor(value * 10) / 10;

  showToast({ title: `${rounded} mmol/l` });
}
