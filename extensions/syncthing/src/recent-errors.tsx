import { getPreferenceValues, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { timestampToReadableTime } from "./utils";

interface Error {
  time: string;
  message: string;
}

interface SyncthingErrorApi {
  when: string;
  message: string;
}

interface SyncthingErrorResponse {
  errors?: SyncthingErrorApi[];
}

async function getRecentErrors(
  API_KEY: string,
  BASE_URL: string,
): Promise<Error[] | void> {
  const headers = {
    "X-API-Key": API_KEY,
    Accept: "application/json",
  };

  try {
    const res = await fetch(BASE_URL + "/system/error", { headers });
    const data = (await res.json()) as SyncthingErrorResponse;
    const errors = data.errors || [];
    console.log("Errors data: ", data);
    if (errors.length === 0) {
      console.log("No recent errors found.");
      return [];
    }
    return errors.map((error) => ({
      time: error.when,
      message: error.message,
    }));
  } catch (error) {
    console.error("Error fetching recent errors:", error);
  }
}

export default function Command() {
  const [errors, setErrors] = useState<Error[]>([]);
  useEffect(() => {
    const API_KEY = getPreferenceValues().api_key;
    const BASE_URL = getPreferenceValues().base_url;
    getRecentErrors(API_KEY, BASE_URL).then((fetchedErrors) => {
      if (fetchedErrors) {
        setErrors(fetchedErrors);
      } else {
        showFailureToast("Failed to fetch errors.");
      }
    });
  }, []);

  return (
    <List>
      {errors.map((error) => (
        <List.Item
          key={error.time}
          title={error.message}
          subtitle={timestampToReadableTime(error.time)}
        />
      ))}
    </List>
  );
}
