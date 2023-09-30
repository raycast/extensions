import { getPreferenceValues } from "@raycast/api";
import { Toggl } from "toggl-track";
import fetch from "node-fetch";
interface Preferences {
  togglAPIKey: string;
}

const ToggleClient = (token: string): Toggl => {
  const client = new Toggl({
    auth: {
      token,
    },
  });
  return client;
};

async function stopTogglTimeEntry(workspace_id: number, time_entry_id: number): Promise<boolean> {
  const preferences = getPreferenceValues<Preferences>();
  // Retrieve the Toggl API token from the extension preferences
  const togglApiToken = preferences.togglAPIKey;
  // Define the URL for the stop endpoint
  const url = `https://api.track.toggl.com/api/v9/workspaces/${workspace_id}/time_entries/${time_entry_id}/stop`;

  // Define the request headers
  const headers = {
    Authorization: `Basic ${Buffer.from(`${togglApiToken}:api_token`).toString("base64")}`,
    "Content-Type": "application/json",
  };

  // Define the request options
  const requestOptions = {
    method: "PATCH",
    headers: headers,
  };

  try {
    // Send the PUT request to stop the time entry
    const response = await fetch(url, requestOptions);

    if (response.status === 200) {
      console.log("Time entry stopped successfully.");
      return true;
    } else {
      console.error("Failed to stop time entry:", response.status, await response.text());
      return false;
    }
  } catch (error: any) {
    console.error("Error stopping time entry:", error.message);
  }
  return false;
}

export { stopTogglTimeEntry };

export default ToggleClient;
