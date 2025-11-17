// auth.ts
import axios from "axios";
import {
  dexcomApplicationId,
  usDexcomAuthenticateURL,
  usDexcomLoginURL,
  dexcomAuthenticateURL,
  dexcomLoginURL,
} from "./constants";
import { LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export async function authenticateWithDexcom(
  accountName: string,
  password: string,
  isNorthAmerica: boolean,
): Promise<string | undefined> {
  try {
    const authResponse = await axios.post(
      isNorthAmerica ? usDexcomAuthenticateURL : dexcomAuthenticateURL,
      {
        accountName,
        password,
        applicationId: dexcomApplicationId,
      },
    );

    const accountId = authResponse.data;

    const loginResponse = await axios.post(
      isNorthAmerica ? usDexcomLoginURL : dexcomLoginURL,
      {
        accountId,
        password,
        applicationId: dexcomApplicationId,
      },
    );

    const sessionId = loginResponse.data;
    await LocalStorage.setItem("sessionId", sessionId);
    return sessionId;
  } catch (error) {
    console.error("Authentication error:", error);
    await showFailureToast({
      title: "Authentication Failed",
      message: String(error),
    });
    return undefined;
  }
}
