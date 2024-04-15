import axios from "axios";
import { confirmAlert, getPreferenceValues, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { cache } from "./cache";
import { parseDateAndTime } from "../utils/date";

export const BASE_URL = "https://api.personio.de/v1";

/**
 * This function retrieves a string token from the personio API with the
 * client secret and client id stored in the preferences
 */
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

/**
 * This is a wrapper-function that implements caching for the personio token.
 * A token from personio is valid for 24 hours, so this cache
 * expires after 23 hours to then request a new one
 */
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

/**
 * This function adds an attendance with the personio API.
 *
 * @param employeeNumber To find the right employee
 * @param date Date of attendance
 * @param start_time Start time of the attendance period
 * @param end_time End time of the attendance period
 * @param break_time Time of the break during the attendance in minutes
 * @param token The personio token to authentiacte for the API
 */
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
    await axios.post(url, payload, { headers });
    await showHUD("Time Tracked 🎉");
    popToRoot();
  } catch (error) {
    if (axios.isAxiosError(error) && error.stack) {
      if (error.stack.includes("IncomingMessage.handleStreamEnd")) {
        console.log("Caught the specific error: IncomingMessage.handleStreamEnd");
        await showToast({ style: Toast.Style.Failure, title: "That didn't work!" });
      } else {
        console.log("Some other Axios error occurred", error);
      }
    } else {
      console.log("An error occurred that is not an Axios error", error);
    }
  }
}

//calls the addTime function with the given values
export interface SubmitTimeFormValues {
  startdate: Date | null;
  enddate: Date | null;
  breaktime: string;
}

export const submitTime = async (values: SubmitTimeFormValues, token: string) => {
  const startdate = parseDateAndTime(values.startdate);
  const enddate = parseDateAndTime(values.enddate);
  const employeeNumber = getPreferenceValues().employeeNumber;
  if (startdate.date == "Invalid date" || startdate.time == "Invalid date") {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: "You must add a valid start time.",
    });
    return;
  }
  if (enddate.date == "Invalid date" || enddate.time == "Invalid date") {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: "You must add a valid end time.",
    });
    return;
  }

  if (
    await confirmAlert({
      title: "Are your sure?",
      message: `Do you want to submit the time from ${startdate.time} to ${enddate.time} with a break of ${values.breaktime} minutes?`,
    })
  ) {
    addTime(employeeNumber, startdate.date, startdate.time, enddate.time, parseInt(values.breaktime), token);
  } else {
    await showToast({ style: Toast.Style.Failure, title: "Submit was cancelled!", message: "Unfortunate!" });
  }
};
