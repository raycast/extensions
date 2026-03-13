import axios from "axios";
import { confirmAlert, getPreferenceValues, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { cache } from "./cache";
import { parseDateAndTime } from "../utils/date";

export const BASE_URL = "https://api.personio.de/v1";

export async function isAuthenticated() {
  const url = BASE_URL + "/auth";
  const payload = {
    client_secret: getPreferenceValues().clientSecret,
    client_id: getPreferenceValues().clientId,
  };
  const headers = {
    accept: "application/json",
    "content-type": "application/json",
  };

  try {
    await axios.post(url, payload, { headers });
    return true;
  } catch {
    console.log("User provided wrong credentials or the Personio API is down or the API permissions are wrong.");
    await showToast({ style: Toast.Style.Failure, title: "Please check your Client ID, Secret and API permissions!" });
    return false;
  }
}

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
    if (token) {
      cache.set("personioToken", token, 23 * 60); // let the token expire after 23 hours
    }
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
    console.log(error);
    await showToast({ style: Toast.Style.Failure, title: "Error", message: "There was an error adding the time." });
  }
}

//calls the addTime function with the given values
export interface SubmitTimeFormValues {
  startDate: Date | null;
  endDate: Date | null;
  breakTime: string;
}

export const submitTime = async (values: SubmitTimeFormValues) => {
  const token = await getPersonioToken();
  const startdate = parseDateAndTime(values.startDate);
  const enddate = parseDateAndTime(values.endDate);
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
      message: `Do you want to submit the time from ${startdate.time} to ${enddate.time} with a break of ${values.breakTime} minutes?`,
    })
  ) {
    addTime(employeeNumber, startdate.date, startdate.time, enddate.time, parseInt(values.breakTime), token);
  } else {
    await showToast({ style: Toast.Style.Failure, title: "Submit was cancelled!", message: "Unfortunate!" });
  }
};
