import {
  CreateRoutingRequest,
  CreateUserRequest,
  UpdateDomainSettingsRequest,
  ErrorResponse,
  Preferences,
  RequestBody,
  Response,
} from "./types";
import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

const API_TOKEN = getPreferenceValues<Preferences>().api_token;
const API_URL = "https://purelymail.com/api/v0/";
const headers = {
  "Content-Type": "application/json",
  "Purelymail-Api-Token": API_TOKEN,
};

const callApi = async (endpoint: string, body: RequestBody) => {
  try {
    const apiResponse = await fetch(API_URL + endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!apiResponse.ok) {
      return {
        type: "error",
        code: "purelymailError",
        message:
          "There was an error with your request. Make sure you are connected to the internet. Please check that your API Token is correct and up-to-date. You can find your API Token in your [Purelymail Account](https://purelymail.com/manage/account). If you need help, please contact support@purelymail.com",
      } as ErrorResponse;
    }

    const response = (await apiResponse.json()) as Response;
    return response;
  } catch (error) {
    return {
      type: "error",
      code: "purelymailError",
      message: "Failed to execute request. Please try again later.",
    } as ErrorResponse;
  }
};

export async function createUser({ ...params }: CreateUserRequest) {
  const body = { ...params };
  return await callApi("createUser", body);
}
export async function deleteUser(userName: string) {
  const body = { userName };
  return await callApi("deleteUser", body);
}

export async function getOwnershipCode() {
  const body = {};
  return await callApi("getOwnershipCode", body);
}
export async function addDomain(domainName: string) {
  const body = { domainName };
  return await callApi("addDomain", body);
}
export async function updateDomainSettings({ ...params }: UpdateDomainSettingsRequest) {
  const body = { ...params };
  return await callApi("updateDomainSettings", body);
}
export async function deleteDomain(name: string) {
  const body = { name };
  return await callApi("deleteDomain", body);
}
export async function getDomains(includeShared = false) {
  const body = { includeShared };
  return await callApi("listDomains", body);
}

export async function createRoutingRule({ ...params }: CreateRoutingRequest) {
  const body = { ...params };
  return await callApi("createRoutingRule", body);
}
export async function deleteRoutingRule(routingRuleId: number) {
  const body = { routingRuleId };
  return await callApi("deleteRoutingRule", body);
}
export async function getRoutingRules() {
  const body = {};
  return await callApi("listRoutingRules", body);
}
