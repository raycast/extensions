import * as api from "../helpers/whoop.api";
import { authorize } from "../api/oauth";
import nodeFetch from "node-fetch";
import { getErrorMessage } from "../helpers/errors";
import { CollectionFunctionParams } from "../helpers/types";

async function setupAPI() {
  const accessToken = await authorize();
  api.defaults.headers = {
    Authorization: `Bearer ${accessToken}`,
  };
  api.defaults.fetch = nodeFetch as unknown as typeof api.defaults.fetch;
}

export async function getCycleCollection(params?: CollectionFunctionParams): Promise<api.PaginatedCycleResponse> {
  try {
    await setupAPI();
    const response = await api.getCycleCollection(params);
    if (response.status !== 200) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    return response.data;
  } catch (err) {
    const error = getErrorMessage(err);
    console.error(`getCycleCollection Error:`, error);
    throw new Error(error);
  }
}

export async function getRecoveryCollection(params?: CollectionFunctionParams): Promise<api.PaginatedRecoveryResponse> {
  try {
    await setupAPI();
    const response = await api.getRecoveryCollection(params);
    if (response.status !== 200) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    return response.data;
  } catch (err) {
    const error = getErrorMessage(err);
    console.error(`getRecoveryCollection Error:`, error);
    throw new Error(error);
  }
}

export async function getSleepCollection(params?: CollectionFunctionParams): Promise<api.PaginatedSleepResponse> {
  try {
    await setupAPI();
    const response = await api.getSleepCollection(params);
    if (response.status !== 200) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    return response.data;
  } catch (err) {
    const error = getErrorMessage(err);
    console.error(`getSleepCollection Error:`, error);
    throw new Error(error);
  }
}
