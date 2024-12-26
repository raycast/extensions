import { setWhoopClient, getWhoopClient } from "../helpers/withWhoopClient";
import * as api from "../helpers/whoop.api";
import { getErrorMessage } from "../helpers/errors";
import { CollectionFunctionParams } from "../helpers/types";

export async function getCycleCollection(params?: CollectionFunctionParams): Promise<api.PaginatedCycleResponse> {
  try {
    await setWhoopClient();
    const { whoopClient } = getWhoopClient();
    const response = await whoopClient.getCycleCollection(params);
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
    await setWhoopClient();
    const { whoopClient } = getWhoopClient();
    const response = await whoopClient.getRecoveryCollection(params);
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
    await setWhoopClient();
    const { whoopClient } = getWhoopClient();
    const response = await whoopClient.getSleepCollection(params);
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
