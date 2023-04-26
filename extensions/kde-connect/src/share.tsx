import { LaunchProps, LocalStorage, Toast, showHUD, showToast } from "@raycast/api";
import { KDEConnect, KDEDevice } from "./device";
import { StorageKey } from "./storage";

interface ShareArguments {
  string: string;
}

function testURL(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch (_) {
    return false;
  }
}

export default async function Command(props: LaunchProps<{ arguments: ShareArguments }>) {
  await showToast({
    title: "Sending",
  });
  LocalStorage.getItem(StorageKey.favouriteDevice).then((favouriteDevice) => {
    if (favouriteDevice) {
      const connect = new KDEConnect(favouriteDevice as string);
      connect.isAvailable().then((availibility) => {
        if (availibility) {
          if (testURL(props.arguments.string)) {
            connect.share(props.arguments.string).then(() => {
              showToast({
                title: "Sent",
                style: Toast.Style.Success,
              });
            });
          } else {
            connect.sendText(props.arguments.string).then(() => {
              showToast({
                title: "Sent",
                style: Toast.Style.Success,
              });
            });
          }
        } else {
          showToast({
            title: "Device not available",
            style: Toast.Style.Failure,
          });
        }
      });

      return;
    }
    showToast({
      title: 'Please set a favourite device in "List and Pair Devices"',
      style: Toast.Style.Failure,
    });
  });
}
