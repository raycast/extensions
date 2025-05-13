// auth.ts
import axios from "axios";
import {
  dexcomApplicationId,
  usDexcomAuthenticateURL,
  usDexcomLoginURL,
  dexcomAuthenticateURL,
  dexcomLoginURL,
} from "./constants";
import { showToast, Toast, LocalStorage } from "@raycast/api";

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
    await showToast({
      style: Toast.Style.Failure,
      title: "Authentication Failed",
      message: String(error),
    });
    return undefined;
  }
}
