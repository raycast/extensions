import { clearSearchBar, closeMainWindow } from "@raycast/api";
import ConnectorSingleton from "./connection/ConnectorSingleton";
import Notifications from "./ui/Notifications";
import piecesHealthCheck from "./connection/health/piecesHealthCheck";

export default async function Comand() {
  const healthy = await piecesHealthCheck();
  if (!healthy) return;

  await ConnectorSingleton.getInstance()
    .osApi.signIntoOS()
    .then(() => {
      clearSearchBar();
      closeMainWindow();
    })
    .catch(() => {
      Notifications.getInstance().serverErrorToast("sign into Pieces");
    });
}
