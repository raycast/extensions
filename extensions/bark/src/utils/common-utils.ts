import { exec, spawnSync } from "child_process";
import {
  Cache,
  Clipboard,
  closeMainWindow,
  environment,
  getSelectedText,
  LocalStorage,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { deviceToken } from "../types/preferences";
import { CacheKey, EXPIRE_TIME } from "./constants";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const getSelectedMessage = async () => {
  try {
    let message = "";
    const selectedText = await getSelectedText();
    if (isEmpty(selectedText)) {
      const copiedText = await Clipboard.readText();
      if (typeof copiedText !== "undefined" && !isEmpty(copiedText)) {
        message = copiedText;
      }
    } else {
      message = selectedText;
    }
    return message.trim().replaceAll("\n", " ");
  } catch (e) {
    console.error(e);
    return "";
  }
};

export const createNewAuthToken = () => {
  const command = "sh";
  const args = [
    `${environment.assetsPath}/token/create-token.sh`,
    `${environment.assetsPath}/token/AuthKey_LH4T9V5U4R_5U8LBRXG3A.p8`,
  ];
  const authToken = spawnSync(command, args).stdout.toString().trim();
  const cacheAuthToken = {
    token: authToken,
    createAt: Date.now(),
  };
  LocalStorage.setItem(CacheKey.AUTHENTICATION_TOKEN, JSON.stringify(cacheAuthToken)).then(() => {});
  return authToken;
};

export const getCacheAuthToken = async () => {
  const cacheString = await LocalStorage.getItem<string>(CacheKey.AUTHENTICATION_TOKEN);
  if (typeof cacheString === "undefined") {
    return createNewAuthToken();
  } else {
    const { token, createAt } = JSON.parse(cacheString);
    const tokenLiveTime = Date.now() - createAt;
    if (tokenLiveTime > EXPIRE_TIME) {
      return createNewAuthToken();
    }
    return token;
  }
};

export const getSound = () => {
  const cache = new Cache();
  const soundStr = cache.get(CacheKey.SOUND);
  if (typeof soundStr === "undefined") {
    return "silence.caf";
  } else {
    return soundStr;
  }
};
export const getIcon = () => {
  const cache = new Cache();
  const iconStr = cache.get(CacheKey.ICON);
  if (typeof iconStr === "undefined") {
    return "";
  } else {
    return iconStr;
  }
};

export const sendMessage = async (
  message: string,
  title: string,
  subTitle: string,
  badge: number,
  autoCloseWindow: boolean,
) => {
  let promptMessage;
  try {
    if (autoCloseWindow) {
      await closeMainWindow({ popToRootType: PopToRootType.Default });
    }

    const APNS_HOST_NAME = "api.push.apple.com";
    const DEVICE_TOKEN = deviceToken;
    const TOPIC = "me.fin.bark";
    const AUTHENTICATION_TOKEN = await getCacheAuthToken();

    const script = `curl -v --header "apns-topic: ${TOPIC}" --header "apns-push-type: alert" --header "authorization: bearer ${AUTHENTICATION_TOKEN}" --data '{
  "aps": {
      "mutable-content": 1,
      "alert": {
          "title" : "${title}",
          "subtitle" : "${subTitle}",
          "body": "${message}"
      },
      "category": "myNotificationCategory",
      "sound": "${getSound()}",
      "badge": ${badge}
  },
  "icon": "${getIcon()}"
}' --http2 https://${APNS_HOST_NAME}/3/device/${DEVICE_TOKEN}`;
    exec(script);
    promptMessage = "Message Sent";
    if (autoCloseWindow) {
      await showHUD(`📩 ${message}`);
    } else {
      await showToast(Toast.Style.Success, isEmpty(title) ? "Message Sent!" : title, message);
    }
  } catch (e) {
    console.error(e);
    promptMessage = "Error: " + e;
    if (autoCloseWindow) {
      await showHUD(`🚨 ${promptMessage}`);
    } else {
      await showToast(Toast.Style.Failure, promptMessage + "!");
    }
  }
};
