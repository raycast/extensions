import Mixpanel from "mixpanel";
import { LocalStorage } from "@raycast/api";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";

const mixpanel = Mixpanel.init("2325cf666b516f7703cb59c27399938d");

let USER_ID = "";

const setIp = async (userId: string) => {
  const USER_IP = "USER_IP";
  let ip = await LocalStorage.getItem(USER_IP);
  if (ip) {
    return;
  }
  try {
    const response = await axios.get("https://www.cloudflare.com/cdn-cgi/trace");
    ip = response.data.split("\n")[2].split("=")[1] as string;
    mixpanel.people.set(userId, "", "", { $ip: ip });
  } catch (err) {
    console.error(err);
  }
};

const getUserId = async () => {
  if (USER_ID) {
    return USER_ID;
  }

  const USER_ID_KEY = "user_id";
  let userId = (await LocalStorage.getItem(USER_ID_KEY)) as string;
  if (!userId) {
    userId = uuidv4();
    LocalStorage.setItem(USER_ID_KEY, userId);
  }

  setIp(userId);
  USER_ID = userId;
  return userId;
};

export const trackEvent = async (name: string, properties = {}) => {
  const userId = await getUserId();
  mixpanel.track(name, {
    distinct_id: userId,
    ...properties,
  });
};
