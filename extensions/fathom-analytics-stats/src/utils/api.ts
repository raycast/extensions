import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

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
  error?: { title: string; message: string; markdown: string };
};

type Data = Page[];

type Page = {
  pageviews: string;
  pathname: string;
};

export default function FathomRequest(request: Request): Response {
  const [errorTitle, setErrorTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [errorMarkdown, setErrorMarkdown] = useState("");
  const preferences = getPreferenceValues<Preferences>();
  const BASE_URL = "https://api.usefathom.com/v1";
  let url = "";

  function handleError(error: Error) {
    if (error.message === "Not Found") {
      setErrorTitle("Bad credentials");
      setErrorMessage("Please check your API token and side ID");
      setErrorMarkdown(
        `# Bad credentials. \n Please check your API token and site ID. \n ## Setup \n 1. Sign in to your Fathom account. \n 2. Obtain an API token [here](https://app.usefathom.com/api) and site ID from Fathom your site settings. \n 3. Add the API token and site ID to the extension preferences in Raycast. Also, if you have selected a site-specific API token, make sure you choose the correct site you want to view in the extension.`,
      );
    } else if (error.message === "Too Many Requests") {
      setErrorTitle("Too many requests");
      setErrorMessage("Please wait a minute before trying a new command");
      setErrorMarkdown(
        `# Too many requests \n For now, Fathom's API is rate limited to 10 requests per minute. Please wait a minute before trying again.`,
      );
    } else {
      setErrorTitle("Unknown error");
      setErrorMessage("Please try again later");
      setErrorMarkdown(
        `# Unknown error \n Please try again later. If the issue persists, please [open an issue](https://github.com/raycast/extensions/issues/new?assignees=&labels=extension,bug&projects=&template=extension_bug_report.yml&title=%5BFathom+Analytics+Stats%5D+Your+title+here) on GitHub.`,
      );
    }
  }

  if (request.aggregates) {
    url = `${BASE_URL}${request.endpoint}?entity_id=${preferences.siteId}&entity=${request.entity}&aggregates=${request.aggregates}&field_grouping=${request.groupBy}&sort_by=${request.sortBy}${request.dateFrom ? `&date_from=${request.dateFrom}` : ""}`;
  } else {
    url = `${BASE_URL}${request.endpoint}?site_id=${preferences.siteId}&detailed=true`;
  }

  const { data, isLoading } = useFetch<Data>(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${preferences.apiToken}`,
    },
    onError: handleError,
  });

  return { data, isLoading, error: { title: errorTitle, message: errorMessage, markdown: errorMarkdown } };
}
