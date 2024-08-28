import { LaunchProps, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export default function Command(props: LaunchProps<{ arguments: Arguments.ConvertFromMgDlToMmolL }>) {
  if (Number.isNaN(props.arguments.value)) {
    showFailureToast("Please enter a valid blood sugar value in mmol/l (e.g. 6.8)");
  }

  const value = Number.parseFloat(props.arguments.value) * 18.018;
  const rounded = Math.floor(value * 10) / 10;

  showToast({ title: `${rounded} mg/dL` });
}
