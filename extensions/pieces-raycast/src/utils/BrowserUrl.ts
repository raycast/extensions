import ConnectorSingleton from "../connection/ConnectorSingleton";
import { open } from "@raycast/api";
import Notifications from "../ui/Notifications";

/** For opening websites that should appends query params about Pieces connection state. Opens URL without params if not connected to POS */
export default class BrowserUrl {
  static open(url: string) {
    const connector = ConnectorSingleton.getInstance();
    connector
      .ensureConnection()
      .then(() => {
        if (!connector.apiContext || !connector.apiContext?.os) {
          open(url);
          return;
        }
        // is connected to POS - append params
        let urlToOpen = url;

        if (connector.apiContext) {
          try {
            const urlObj = new URL(url);

            // add OS ID if available
            if (connector.apiContext.os) {
              urlObj.searchParams.append("os", connector.apiContext.os);
            }
            // add user ID if available
            if (connector.apiContext.user?.id) {
              urlObj.searchParams.append("user", connector.apiContext.user.id);
            }

            urlToOpen = urlObj.toString();
          } catch (error) {
            console.error("Invalid URL:", error);
            urlToOpen = url;
          }
        }

        open(urlToOpen);
      })
      .catch((e) => {
        console.error(e);
        Notifications.getInstance().errorToast("Failed to open URL");
      });
  }
}
