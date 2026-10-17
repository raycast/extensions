import { getPreferenceValues, Tool } from "@raycast/api";

import { StatusReport } from "../api/schema";

type Input = {
  /* The ID of the Status Page. Fetch from show-status-pages */
  pageId: string;
  title: string;
  message: string;
  /* The status of the update. Based on user entry, set this as one of the following: investigating, identified, monitoring, resolved */
  status: string;
  /* The start date of the incident. The date CANNOT be in the past. Parse it as a date. */
  date?: string;
};

export default async function (input: Input) {
  const { access_token } = getPreferenceValues<Preferences>();
  const response = await fetch("https://api.openstatus.dev/v1/status_report", {
    headers: {
      "x-openstatus-key": `${access_token}`,
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      ...input,
      pageId: +input.pageId,
      date: new Date(input.date || Date.now()).toISOString(),
    }),
  });
  if (!response.ok) throw new Error("Failed to create status report");
  const result = await response.json();
  return result as StatusReport;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    info: [
      {
        name: "Title",
        value: input.title,
      },
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
        name: "Page ID",
        value: input.pageId,
      },
    ],
  };
};
