import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react"

type Request = {
  endpoint: string;
  entity?: string;
  aggregates?: string;
  groupBy?: string;
  sortBy?: string;
  dateFrom: string;
};

type Response = {
  data: Data | null | undefined;
  isLoading: boolean;
  error?: { title: string; message: string };
};

type Data = Page[];

type Page = {
  pageviews: string;
  pathname: string;
};

export default function FathomRequest(request: Request): Response {
  const [errorTitle, setErrorTitle] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const preferences = getPreferenceValues<Preferences>();
  const BASE_URL = "https://api.usefathom.com/v1";
  let url = "";

  function handleError(error: Error) {
    if (error.message === "Not Found") {
      setErrorTitle("Bad credentials")
      setErrorMessage("Please check your API token and side ID")
    } else if (error.message === "Too Many Requests") {
      setErrorTitle("Too many requests")
      setErrorMessage("Please wait a minute before trying a new command")
    }
  }

  if (request.aggregates) {
    url = `${BASE_URL}${request.endpoint}?entity_id=${preferences.siteId}&entity=${request.entity}&aggregates=${request.aggregates}&field_grouping=${request.groupBy}&sort_by=${request.sortBy}${request.dateFrom ? `&date_from=${request.dateFrom}` : ""}`;
  } else {
    url = `${BASE_URL}${request.endpoint}?site_id=${preferences.siteId}&detailed=true`;
  }

  const { data, isLoading, error } = useFetch<Data>(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${preferences.apiToken}`,
    },
    onError: handleError
  });

  return { data, isLoading, error: { title: errorTitle, message: errorMessage } };
}