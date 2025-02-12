import { Color, getPreferenceValues } from "@raycast/api";
import fetch, { FetchError, Response } from "node-fetch";
import { ErrorText, PresentableError } from "./exception";

const prefs: {
  domain: string;
  user: string;
  token: string;
  redIssues: string;
  orangeIssues: string;
  blueIssues: string;
} = getPreferenceValues();

function getRedmineUrl(domain: string) {
  if (domain.startsWith("https://")) return domain;
  if (domain.startsWith("http://")) return domain;
  return `https://${prefs.domain}`;
}
export const redmineUrl = getRedmineUrl(prefs.domain);

const headers = {
  Accept: "application/json",
  "X-Redmine-API-Key": prefs.token,
};
const init = {
  headers,
};

const priorityColors: Record<string, Color> = {};
if (prefs.redIssues) {
  const redIssues = prefs.redIssues.toLowerCase().split(",");
  redIssues.forEach((priority) => {
    priorityColors[priority] = Color.Red;
  });

  const orangeIssues = prefs.orangeIssues.toLowerCase().split(",");
  orangeIssues.forEach((priority) => {
    priorityColors[priority] = Color.Orange;
  });

  const blueIssues = prefs.blueIssues.toLowerCase().split(",");
  blueIssues.forEach((priority) => {
    priorityColors[priority] = Color.Blue;
  });
}

export function priorityColor(priority: string): Color {
  const priorityLower = priority.toLowerCase();
  if (priorityColors[priorityLower]) return priorityColors[priorityLower];
  return Color.PrimaryText;
}

type QueryParams = { [key: string]: string };
type StatusErrors = { [key: number]: ErrorText };

/**
 * Fetches a JSON object of type `Result` or throws an exception if the request fails or returns a non-okay status code.
 * @param path the Redmine path (without domain) to fetch
 * @param params an object defining the query params to request
 * @param statusErrors define custom error texts for response status codes to be thrown
 * @throws if the response's status code is not okay
 * @return the redmine response
 */
export async function redmineFetchObject<Result>(
  path: string,
  params: QueryParams = {},
  statusErrors?: StatusErrors
): Promise<Result> {
  const response = await redmineFetch(path, params, statusErrors);
  return (await response.json()) as Result;
}

/**
 * Fetches a response from Redmine or throws an exception if the request fails or returns a non-okay status code.
 * @param path the Redmine path (without domain) to fetch
 * @param params an object defining the query params to request
 * @param statusErrors define custom error texts for response status codes to be thrown
 * @throws if the response's status code is not okay
 * @return the Redmine response
 */
export async function redmineFetch(
  path: string,
  params: QueryParams = {},
  statusErrors?: StatusErrors
): Promise<Response> {
  const paramKeys = Object.keys(params);
  const query = paramKeys.map((key) => `${key}=${encodeURI(params[key])}`).join("&");
  try {
    const sanitizedPath = path.startsWith("/") ? path.substring(1) : path;
    const url = `${redmineUrl}/${sanitizedPath}` + (query.length > 0 ? `?${query}` : "");
    const response = await fetch(url, init);
    throwIfResponseNotOkay(response, statusErrors);
    return response;
  } catch (error) {
    console.error(error);
    if (error instanceof FetchError) throw Error("Check your network connection");
    else throw error;
  }
}

const defaultStatusErrors: StatusErrors = {
  401: ErrorText("Redmine Authentication failed", "Check your Redmine credentials in the preferences."),
};

function throwIfResponseNotOkay(response: Response, statusErrors?: StatusErrors) {
  if (!response.ok) {
    const status = response.status;
    const definedStatus = statusErrors ? { ...defaultStatusErrors, ...statusErrors } : defaultStatusErrors;
    const exactStatusError = definedStatus[status];
    if (exactStatusError) throw new PresentableError(exactStatusError.name, exactStatusError.message);
    else if (status >= 500) throw new PresentableError("Redmine Error", `Server error ${status}`);
    else throw new PresentableError("Redmine Error", `Request error ${status}`);
  }
}
