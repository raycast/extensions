import fetch, { Response, FetchError } from "node-fetch";
import https from "https";
import { preferences } from "../helpers/preferences";
import { ErrorText, PresentableError } from "./exception";

export type QueryParams = {
  [key: string]: string | number;
};

export type BodyParams = {
  [key: string]: unknown;
};

export type StatusErrors = {
  [key: number]: ErrorText;
};

export type Options = {
  method: string;
  query?: QueryParams;
  body?: BodyParams;
};

const defaultStatusErrors: StatusErrors = {
  401: ErrorText("Bamboo Authentication failed", "Check your Bamboo credentials in the preferences."),
};

const throwIfResponseNotOkay = (response: Response, statusErrors?: StatusErrors) => {
  if (!response.ok) {
    const status = response.status;
    const definedStatus = statusErrors ? { ...defaultStatusErrors, ...statusErrors } : defaultStatusErrors;
    const exactStatusError = definedStatus[status];

    if (exactStatusError) {
      throw new PresentableError(exactStatusError.name, exactStatusError.message);
    } else if (status >= 500) {
      throw new PresentableError("Bamboo Error", `Server error ${status}`);
    } else {
      throw new PresentableError("Bamboo Error", `Request error ${status}`);
    }
  }
};

const buildQuery = (query?: QueryParams) => {
  if (!query) {
    return "";
  }

  return Object.keys(query)
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`)
    .join("&");
};

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

export const request = async <T>(endpoint = "", options: Options, statusErrors?: StatusErrors): Promise<T> => {
  const query = buildQuery(options.query);
  const url = `https://${preferences.host}/rest/api/latest${endpoint}.json?${query}`;

  try {
    const response = await fetch(url, {
      agent: !preferences.sslVerify ? httpsAgent : undefined,
      method: options.method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${preferences.authToken}`,
      },
      body: options.body ? JSON.stringify(options.body) : null,
    });

    throwIfResponseNotOkay(response, statusErrors);

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof FetchError) {
      throw Error("Check your network connection");
    } else {
      throw error;
    }
  }
};
