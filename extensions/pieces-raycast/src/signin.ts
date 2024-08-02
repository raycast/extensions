import {
  clearSearchBar,
  closeMainWindow,
  showToast,
  Toast,
} from "@raycast/api";
import ConnectorSingleton from "./connection/ConnectorSingleton";
import Notifications from "./ui/Notifications";
import piecesHealthCheck from "./connection/health/piecesHealthCheck";

export default async function Comand() {
  const healthy = await piecesHealthCheck();
  if (!healthy) return;

  const user = await ConnectorSingleton.getInstance().userApi.userSnapshot();

  if (user.user) {
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
