import axios, { AxiosResponse } from "axios";
import { KEEPER_COMMANDER_CLI_COMMANDS } from "../lib/constants";
import { getPreferenceValues } from "@raycast/api";
import { KeeperExtensionPreferences } from "../lib/types";

const preferences = getPreferenceValues<KeeperExtensionPreferences>();

const BASE_API_URL = `${preferences.apiUrl}/api/v1/executecommand`;

// Single map to store controllers for all functions
const activeControllers = new Map<string, AbortController>();

const getApiHeaders = () => {
  return {
    "Content-Type": "application/json",
    "api-key": preferences.apiKey.trim(),
  };
};

// Generic function to handle request cancellation
const makeRequest = async (
  functionName: string,
  command: string,
  commandOptions?: string[],
): Promise<AxiosResponse> => {
  // Cancel previous request for the function
  const existingController = activeControllers.get(functionName);
  if (existingController) {
    existingController.abort();
  }

  // Create new controller
  const controller = new AbortController();
  activeControllers.set(functionName, controller);

  let fullCommand = command;
  if (commandOptions?.length) {
    fullCommand = command + " " + commandOptions.join(" ");
  }

  try {
    const response = await axios.post(
      BASE_API_URL,
      { command: fullCommand },
      {
        headers: getApiHeaders(),
        signal: controller.signal,
      },
    );
    return response;
  } catch (error) {
    // Clean up on error
    activeControllers.delete(functionName);

    throw error;
  }
};

/**
 * Generate a random password
 * @param commandOptions string[]
 * @returns
 */
export const generatePassword = async (commandOptions?: string[]): Promise<AxiosResponse> => {
  return makeRequest("generatePassword", KEEPER_COMMANDER_CLI_COMMANDS.GENERATE_PASSWORD, commandOptions);
};

/**
 * Generate a 24-word phrase
 * @returns
 */
export const generatePassphrase = async (): Promise<AxiosResponse> => {
  const response = await generatePassword(["--recoveryphrase"]);
  return response;
};

/**
 * Fetch all records from vault
 * @returns
 */
export const listAllRecords = async (): Promise<AxiosResponse> => {
  return makeRequest("listAllRecords", KEEPER_COMMANDER_CLI_COMMANDS.LIST_ALL_RECORDS);
};

/**
 * Get record by uid
 *
 * @param recordId string
 * @returns
 */
export const getRecordById = async (recordId: string): Promise<AxiosResponse> => {
  return makeRequest(`getRecordById-${recordId}`, KEEPER_COMMANDER_CLI_COMMANDS.GET_RECORD_BY_ID(recordId));
};

/**
 * Sync latest records from vault
 *
 * @returns
 */
export const syncRecords = async (): Promise<AxiosResponse> => {
  return makeRequest("syncRecords", KEEPER_COMMANDER_CLI_COMMANDS.SYNC_RECORDS);
};

/**
 * Generate One-Time Share URL for a record for 15 minutes
 * @param recordId string
 * @returns One-Time Share URL
 */
export const oneTimeShareRecord = async (recordId: string): Promise<AxiosResponse> => {
  return makeRequest(`oneTimeShare-${recordId}`, KEEPER_COMMANDER_CLI_COMMANDS.ONE_TIME_SHARE_RECORD(recordId));
};

/**
 * Get Two Factor Code for a record
 * @param recordId string
 * @returns Two Factor Code
 */
export const getTwoFactorCode = async (recordId: string): Promise<AxiosResponse> => {
  return makeRequest(`twoFactor-${recordId}`, KEEPER_COMMANDER_CLI_COMMANDS.GET_TWO_FACTOR_CODE(recordId));
};

/**
 * Get server URL
 * @returns Server URL
 */
export const getServerUrl = async (): Promise<AxiosResponse> => {
  return makeRequest("getServerUrl", KEEPER_COMMANDER_CLI_COMMANDS.GET_SERVER_URL);
};
