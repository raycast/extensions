import { NewResponse, Profile, Request, Response } from "./types";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { LocalStorage, showToast, Toast } from "@raycast/api";

function parseRequestHeaders(data: string, currentProfile: Profile | undefined): { [p: string]: string } {
  const headers: { [key: string]: string } = {};

  data.split("\n").forEach((line) => {
    const res = line.split(":");
    if (res.length < 2) {
      return;
    }

    let headerValue = res.slice(1).join("=");
    if (currentProfile !== undefined) {
      for (const [key, value] of Object.entries(currentProfile.fields)) {
        headerValue = headerValue.replace(`{${key}}`, value);
      }
    }

    headers[res[0]] = headerValue;
  });

  return headers;
}

export function buildRequestURL(u: string, currentProfile: Profile | undefined): string {
  if (currentProfile !== undefined) {
    for (const [key, value] of Object.entries(currentProfile.fields)) {
      u = u.replace(`{${key}}`, value);
    }
  }

  if (u.indexOf("://") < 0) {
    u = `http://${u}`;
  }

  return u;
}

function buildRequestConfig(item: Request, currentProfile: Profile | undefined): AxiosRequestConfig {
  const u = buildRequestURL(item.URL, currentProfile);

  const cfg: AxiosRequestConfig = {
    method: item.Method,
    url: u,
    validateStatus: function (status) {
      return status >= 100 && status <= 999;
    },
    // prevent parse response data
    transformResponse: function (data) {
      return data;
    },
  };

  if (item.RequestBody.length > 0) {
    cfg.data = item.RequestBody;
  }

  if (item.RequestHeaders.length > 0) {
    cfg.headers = parseRequestHeaders(item.RequestHeaders, currentProfile);
  }

  return cfg;
}

export async function runRequest(item: Request): Promise<Response> {
  const profileContent = await LocalStorage.getItem("currentProfile");
  const profile: Profile = JSON.parse(profileContent?.toString() || "{}");

  const result: Response = NewResponse();

  const tst = await showToast(Toast.Style.Animated, item.Name, "Running...");

  try {
    const start: number = Date.now();
    const resp: AxiosResponse = await axios.request(buildRequestConfig(item, profile));
    const end: number = Date.now();

    result.ExecutionTime = end - start;
    result.StatusCode = resp.status;
    result.StatusText = resp.statusText;
    result.Body = resp.data;

    Object.keys(resp.headers).forEach((key) => {
      result.Headers[key] = resp.headers[key];
    });

    // for images save the URL to display in the UI
    if (resp.headers["content-type"]?.startsWith("image/")) {
      result.ImageURL = item.URL;
    }

    tst.message = `${resp.status} ${resp.statusText}`;
    tst.style = Toast.Style.Success;
  } catch (err) {
    tst.message = `${err}`;
    tst.style = Toast.Style.Failure;
    result.StatusText = `${err}`;
  }

  return result;
}
