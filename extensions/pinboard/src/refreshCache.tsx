import { Cache, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect } from "react";
import { refreshCache } from "./api";

const { apiToken } = getPreferenceValues();

const ALL_ENDPOINT = "https://api.pinboard.in/v1/posts/all";
const LAST_UPDATED_ENDPOINT = "https://api.pinboard.in/v1/posts/update";
const params = new URLSearchParams({ auth_token: apiToken, format: "json" });

type LastUpdated = {
  update_time: string;
};

export default function RefreshCache() {
  useEffect(() => {
    refreshCache();
  })
}
