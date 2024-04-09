import axios from "axios";
import { getPreferenceValues, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { cache } from "./cache";

export const BASE_URL = "https://api.personio.de/v1";

export async function getTokenFromAPI() {
  const url = BASE_URL + "/auth";
  const payload = {
    client_secret: getPreferenceValues().clientSecret,
    client_id: getPreferenceValues().clientId,
  };
  const headers = {
    accept: "application/json",
    "content-type": "application/json",
  };

  const res = await axios.post(url, payload, { headers });
  const data = res.data;
  const token = data.data.token;

  return token;
}

// this function uses the secrets to get a short-lived (one day) token
export async function getPersonioToken(caching = true) {
  if (!caching) {
    return await getTokenFromAPI();
  }

  const cacheDataToken = cache.get("personioToken");

  if (cacheDataToken) {
    return cacheDataToken;
  } else {
    const token = await getTokenFromAPI();
    cache.set("personioToken", token, 23 * 60); // let the token expire after 23 hours
    return token;
  }
}

export async function addTime(
  employeeNumber: number,
  date: string,
  start_time: string,
  end_time: string,
  break_time: number,
  token: string,
) {
  const url = BASE_URL + "/company/attendances";

  const payload = {
    attendances: [
      {
        employee: employeeNumber,
        date: date,
        start_time: start_time,
        end_time: end_time,
        break: break_time,
      },
    ],
  };

  const headers = {
    accept: "application/json",
    "content-type": "application/json",
    authorization: "Bearer " + token,
  };

  try {
    axios.post(url, payload, { headers });
    await showHUD("Time Tracked 🎉");
    popToRoot();
  } catch (error) {
    if (axios.isAxiosError(error) && error.stack) {
      if (error.stack.includes("IncomingMessage.handleStreamEnd")) {
        console.log("Caught the specific error: IncomingMessage.handleStreamEnd");
        await showToast({ style: Toast.Style.Failure, title: "That didn't work!" });
      } else {
        // Handle other errors
        console.log("Some other Axios error occurred", error);
      }
    } else {
      console.log("An error occurred that is not an Axios error", error);
    }
  }
}
