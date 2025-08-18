import { getPreferenceValues, Tool } from "@raycast/api";

import { StatusReportUpdate } from "../api/schema";

type Input = {
  /* The ID of the Status Report. Fetch from show-status-reports. Filter such that status is NOT 'resolved' */
  statusReportId: string;
  message: string;
  /* The status of the update. Based on user entry, set this as one of the following EXACTLY: 'investigating' or 'identified' or 'monitoring' or 'resolved'. If status is not obvious, prompt user to re-enter. */
  status: "investigating" | "identified" | "monitoring" | "resolved";
  /* The start date of the update. The date CANNOT be in the past. Parse it as a date. If no date given, use current. */
  date?: string;
};

export default async function (input: Input) {
  const { access_token } = getPreferenceValues<Preferences>();
  const response = await fetch("https://api.openstatus.dev/v1/status_report_update", {
    headers: {
      "x-openstatus-key": `${access_token}`,
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      ...input,
      date: new Date(input.date || Date.now()).toISOString(),
    }),
  });

  if (!response.ok) throw new Error("Failed to create status report update");
  const result = await response.json();
  return result as StatusReportUpdate;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    info: [
      {
        name: "Message",
        value: input.message,
      },
      {
        name: "Start Date",
        value: input.date,
      },
      {
        name: "Status",
        value: input.status,
      },
      {
        name: "Status Report ID",
        value: input.statusReportId,
      },
    ],
  };
};
