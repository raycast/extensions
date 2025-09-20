import {
  LaunchProps,
  LocalStorage,
  Toast,
  getSelectedFinderItems,
  getSelectedText,
  showToast,
  popToRoot,
} from "@raycast/api";
import { KDEConnect } from "./device";
import { StorageKey } from "./storage";
import { existsSync } from "fs";
import { SendType, startApp } from "./connector";
import { showFailureToast } from "@raycast/utils";

interface ShareArguments {
  string?: string;
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
  let sendType: SendType.Text | SendType.URL | SendType.Files = SendType.Text;
  let sendContent: string | undefined;
  let selectedFiles: string[] = [];

  try {
    await startApp();
  } catch (error) {
    showFailureToast(error, { title: "Error Starting KDE Connect" });
  }

  if (props.arguments.string) {
    if (testURL(props.arguments.string) || existsSync(props.arguments.string)) {
      sendType = SendType.URL;
    } else {
      sendContent = props.arguments.string;
    }
  } else {
    try {
      selectedFiles = (await getSelectedFinderItems()).flatMap((item) => item.path);
      if (selectedFiles.length === 1) {
        sendType = SendType.URL;
        sendContent = selectedFiles[0];
      } else if (selectedFiles.length > 1) {
        sendType = SendType.Files;
      }
    } catch {
      try {
        sendContent = await getSelectedText();
      } catch {
        showToast({
          title: "No content selected",
          style: Toast.Style.Failure,
        });
        return;
      }
    }
  }

  if (!sendContent && selectedFiles.length === 0) {
    showToast({
      title: "Provide something to send",
      style: Toast.Style.Failure,
    });

    return;
  }

  const shownToast = await showToast({
    title: "Sending",
    style: Toast.Style.Animated,
  });

  const favouriteDevice = await LocalStorage.getItem(StorageKey.favouriteDevice);

  if (!favouriteDevice) {
    shownToast.title = "No Favourite Device Set";
    shownToast.message = 'Please set a favourite device in "List and Pair Devices"';
    shownToast.style = Toast.Style.Failure;

    return;
  }

  const connect = new KDEConnect(favouriteDevice as string);
  const availibility = await connect.isAvailable();

  if (availibility) {
    switch (sendType) {
      case SendType.Text:
        connect
          .sendText(sendContent as string)
          .then(() => {
            shownToast.title = "Sent";
            shownToast.message = undefined;
            shownToast.style = Toast.Style.Success;
          })
          .catch((error) => {
            shownToast.title = "Failed to send text";
            shownToast.message = error.message;
            shownToast.style = Toast.Style.Failure;
          });
        break;

      case SendType.URL:
        connect
          .share(sendContent as string)
          .then(() => {
            shownToast.title = "Sent";
            shownToast.message = undefined;
            shownToast.style = Toast.Style.Success;
          })
          .catch((error) => {
            shownToast.title = "Failed to share";
            shownToast.message = error.message;
            shownToast.style = Toast.Style.Failure;
          });
        break;

      case SendType.Files:
        connect.sendFiles(selectedFiles, shownToast);
        break;
    }
  } else {
    shownToast.title = "Device not available";
    shownToast.message = "Please check if the device is online and paired";
    shownToast.style = Toast.Style.Failure;
  }

  await popToRoot();
}
