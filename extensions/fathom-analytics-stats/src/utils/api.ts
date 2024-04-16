import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { Browser } from "../types/Browser";
import { Country } from "../types/Country";
import { Device } from "../types/Device";
import { Page } from "../types/Page";
import { Referrer } from "../types/Referrer";
import { LiveData } from "../types/LiveData";

type Request = {
  endpoint: string;
  entity?: string;
  aggregates?: string;
  groupBy?: string;
  sortBy?: string;
  dateFrom?: string;
};

type Response = {
  data: Browser[] | Country[] | Device[] | Page[] | Referrer[] | LiveData[] | undefined;
  isLoading: boolean;
  error?: { title: string; message: string; markdown: string };
};

export default function FathomRequest(request: Request) {
  const [errorTitle, setErrorTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [errorMarkdown, setErrorMarkdown] = useState("");
  const preferences = getPreferenceValues<Preferences>();
  const BASE_URL = "https://api.usefathom.com/v1";
  let url = "";

  if (request.aggregates) {
    url = `${BASE_URL}${request.endpoint}?entity_id=${preferences.siteId}&entity=${request.entity}&aggregates=${request.aggregates}&field_grouping=${request.groupBy}&sort_by=${request.sortBy}${request.dateFrom ? `&date_from=${request.dateFrom}` : ""}`;
  } else {
    url = `${BASE_URL}${request.endpoint}?site_id=${preferences.siteId}&detailed=true`;
  }

  const { data, isLoading } = useFetch<Response>(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${preferences.apiToken}`,
      Accept: "application/json",
    },
    onError: (error) => {
      console.log(error.message);
      switch (error.message) {
        case "Unauthorized" || "Not Found":
          setErrorTitle("Bad credentials");
          setErrorMessage("Please check your API token and side ID");
          setErrorMarkdown(
            `# Bad credentials \n Please check your API token and site ID. \n ## Setup \n 1. Sign in to your Fathom account. \n 2. Obtain an API token [here](https://app.usefathom.com/api) and site ID from Fathom your site settings. \n 3. Add the API token and site ID to the extension preferences in Raycast. Also, if you have selected a site-specific API token, make sure you choose the correct site you want to view in the extension.`,
          );
          break;
        case "Too Many Requests":
          setErrorTitle("Too many requests");
          setErrorMessage("Please wait a minute before trying a new command");
          setErrorMarkdown(
            `# Too many requests \n For now, Fathom's API is rate limited to 10 requests per minute. Please wait a minute before trying again.`,
          );
          break;
        default:
          setErrorTitle("Unknown error");
          setErrorMessage("Please try again later");
          setErrorMarkdown(
            `# Unknown error \n Please try again later. If the issue persists, please [open an issue](https://github.com/raycast/extensions/issues/new?assignees=&labels=extension,bug&projects=&template=extension_bug_report.yml&title=%5BFathom+Analytics+Stats%5D+Your+title+here) on GitHub.`,
          );
          break;
      }
    },
    onData: (response) => {
      if (Object.keys(response).length === 0) setErrorTitle("No data to display");
      setErrorMessage("Please check you've connected Fathom to your website");
      setErrorMarkdown(
        `# No data to display \n Please check you've connected Fathom to your website. \n ## Setup \n To start securely tracking data, Fathom provides a code snippet to add to the <head> of your website (or your header template). You can browse the full instructions for using the embed code in their [support documentation](https://usefathom.com/support/tracking).`,
      );
    },
  });

  return { data, isLoading, error: { title: errorTitle, message: errorMessage, markdown: errorMarkdown } };
}
