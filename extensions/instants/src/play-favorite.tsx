import { LaunchProps, showToast, Toast, closeMainWindow, PopToRootType } from "@raycast/api";
import { runPlayFavoriteAndClose } from "./utils/playFavorite";

export default async function Command(props: LaunchProps<{ arguments: Arguments.PlayFavorite }>) {
  const raw = props.arguments?.number;
  const index = raw ? parseInt(String(raw).trim(), 10) : NaN;

  if (Number.isNaN(index) || index < 1) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid Number",
      message:
        "Provide a favorite number (e.g. 1). Use the Play Favorite command with a number argument or a deep link.",
    });
    await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
    return;
  }

  await runPlayFavoriteAndClose(index);
}
