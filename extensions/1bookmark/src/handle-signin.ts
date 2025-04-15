import { hostname } from "node:os";
import { showToast, Toast } from "@raycast/api";
import axios from "axios";
import { API_URL_SIGNIN } from "./utils/constants.util";

export const handleSignIn = async (form: { email: string; token: string; onSuccess: (token: string) => void }) => {
  const { email, token, onSuccess } = form;
  try {
    const deviceName = hostname();
    const res = await axios.post(API_URL_SIGNIN, { email, token, deviceName });
    const setCookieHeaders = res?.headers?.["set-cookie"];
    const sessionTokenLine = setCookieHeaders?.find((header: string) => header.includes("authjs.session-token="));

    if (!sessionTokenLine) {
      throw new Error("Failed to get session token");
    }

    showToast({
      style: Toast.Style.Success,
      title: "Signin Success",
    });

    console.log("🚀 login success!");
    onSuccess(sessionTokenLine);
  } catch (err) {
    showToast({
      style: Toast.Style.Failure,
      title: "Signin Failed",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
};
