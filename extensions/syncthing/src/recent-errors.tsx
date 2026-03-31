import { getPreferenceValues, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { timestampToReadableTime } from "./utils";

interface SyncthingError {
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
): Promise<SyncthingError[] | void> {
  const headers = {
    "X-API-Key": API_KEY,
    Accept: "application/json",
  };

  try {
    const res = await fetch(BASE_URL + "/system/error", { headers });
    if (!res.ok) {
      throw new Error(`Failed to fetch errors: ${res.status}`);
    }
    const data = (await res.json()) as SyncthingErrorResponse;
    const errors = data.errors || [];
    if (errors.length === 0) {
      return [];
    }
    return errors.map((error) => ({
      time: error.when,
      message: error.message,
    }));
  } catch {
    showFailureToast("Failed to fetch errors.");
  }
}

export default function Command() {
  const [errors, setErrors] = useState<SyncthingError[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const API_KEY = getPreferenceValues().api_key;
    const BASE_URL = getPreferenceValues().base_url;
    getRecentErrors(API_KEY, BASE_URL).then((fetchedErrors) => {
      setIsLoading(false);
      if (fetchedErrors) {
        setErrors(fetchedErrors);
      }
    });
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search errors...">
      <List.EmptyView
        title="No errors found"
        description="Syncthing has no recent errors."
      />
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
