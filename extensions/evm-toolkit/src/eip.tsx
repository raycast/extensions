import { closeMainWindow, LaunchProps, open, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

const EIP_REGEX = /^\d{1,5}$/;

export default async function Command(
  props: LaunchProps<{ arguments: Arguments.Eip }>,
) {
  const eip = props.arguments.eip.trim();

  if (!EIP_REGEX.test(eip)) {
    await showFailureToast("Enter a valid EIP number (1 to 5 digits)", {
      title: "Invalid EIP number",
    });
    return;
  }

  const url = `https://eips.ethereum.org/EIPS/eip-${eip}`;
  await open(url);
  await closeMainWindow();
  await showHUD("Opened in browser");
}
