import { LocalStorage } from "@raycast/api";
import { getToken } from "../api";
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
  const { app_key } = await getToken(challengeId, code);
  await LocalStorage.setItem(localStorageKeys.appKey, app_key);
  return "Challenge solved successfully!";
}
