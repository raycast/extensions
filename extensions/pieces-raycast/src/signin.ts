import {
  clearSearchBar,
  closeMainWindow,
  showToast,
  Toast,
} from "@raycast/api";
import ConnectorSingleton from "./connection/ConnectorSingleton";
import Notifications from "./ui/Notifications";
import PiecesPreflightService, {
  piecesHealthOnlyCheck,
} from "./connection/health/piecesPreflightCheck";

export default async function Command() {
  const healthy = await piecesHealthOnlyCheck();
  if (!healthy) return;

  if (PiecesPreflightService.getInstance().user) {
    return await Notifications.getInstance().errorToast(
      "You are already logged in!",
    );
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Opening login page",
  });

  await ConnectorSingleton.getInstance()
    .osApi.signIntoOS()
    .then(() => {
      clearSearchBar();
      closeMainWindow();
    })
    .catch(() => {
      Notifications.getInstance().serverErrorToast("sign into Pieces");
    });

  toast.hide();
}
