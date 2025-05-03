import { useFetch } from "@raycast/utils";
import { GetSubscriptionsResponse } from "./types";
import { getPreferenceValues } from "@raycast/api";

export const getStuff = () => {
  const { subwatchApiKey } = getPreferenceValues<Preferences>();
  return useFetch<[GetSubscriptionsResponse]>("https://nzyzephaenhlxoohrphc.supabase.co/rest/v1/rpc/raycast_get_data", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56eXplcGhhZW5obHhvb2hycGhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxOTQzMjgsImV4cCI6MjA1OTc3MDMyOH0.6AboCGgJGqJMTgqUH3LsYmhoWQ8sfEWqdv0cY-1EXIg",
    },
    body: JSON.stringify({ raycast_uuid: subwatchApiKey }),
  });
};
