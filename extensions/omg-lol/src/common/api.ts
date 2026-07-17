import fetch from "node-fetch";
import { RequestInit } from "node-fetch";
import { getTokens } from "./oauth";
import { getAccount } from "./account";

const API_BASE = "https://api.omg.lol/";

interface Response<T> {
  request: {
    status_code: number;
    success: boolean;
  };
  response: T;
}

export async function GET<T>(
  path: string,
  account: boolean = false,
): Promise<T> {
  return request("GET", path, undefined, account);
}

export async function POST<T>(path: string, body: object): Promise<T> {
  return request("POST", path, body);
}

export async function DELETE<T>(path: string): Promise<T> {
  return request("DELETE", path);
}

async function request<T>(
  method: string,
  path: string,
  body: object | undefined = undefined,
  account: boolean = false,
): Promise<T> {
  const tokenSet = await getTokens();
  const accountBase = account ? "" : `address/${await getAccount()}/`;
  const request: RequestInit = {
    headers: {
      Authorization: `Bearer ${tokenSet.accessToken}`,
    },
    method: method,
  };
  if (body) {
    request.body = JSON.stringify(body);
  }

  const response = await fetch(API_BASE + accountBase + path, request);
  if (!response.ok) {
    console.log(await response.text());
    throw new Error("Request failed");
  }

  const data = (await response.json()) as Response<T>;
  if (!data.request.success) {
    throw new Error("API request failed");
  }

  return data.response;
}
