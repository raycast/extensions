import { LocalStorage } from "@raycast/api";
import { createApiKey } from "../api";
import { localStorageKeys } from "../utils";

type Input = {
  /**
   * The ID of the challenge to solve.
   * This value can be obtained from the `start-challenge` tool.
   */
  challengeId: string;

  /**
   * The 4-digit code to solve the challenge.
   * This value must be given by the user.
   */
  code: string;
};

/**
 * Complete the pairing process with the Anytype desktop app.
 * This function obtains the API token by solving the challenge and storing the token in the extension's local storage.
 */
export default async function tool({ challengeId, code }: Input) {
  const { api_key } = await createApiKey({ challenge_id: challengeId, code });
  await LocalStorage.setItem(localStorageKeys.apiKey, api_key);
  return "Challenge solved successfully!";
}
