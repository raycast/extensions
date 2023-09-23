import { Cache, LaunchType, LocalStorage, Toast, launchCommand, showToast } from "@raycast/api";
import { LoginPayload } from "./interfaces";
import { LINKINIZE_DOMAIN, TOKEN } from "./constants";
import axios, { AxiosError, AxiosResponse } from "axios";

const cache = new Cache();

export function validateLoginPayload(values: LoginPayload) {
  const errors: any = {};
  if (!/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(values.email)) {
    errors.email = "Invalid Email Address";
  }
  if (values.password.length < 1) {
    errors.password = "Password can't be empty.";
  }
  return errors;
}

export async function isLoggedIn() {
  return await LocalStorage.getItem<string>(TOKEN);
}

export async function attemptLogin(values: LoginPayload) {
  axios
    .post(`${LINKINIZE_DOMAIN}/api/auth/login`, values)
    .then(async function (response: AxiosResponse) {
      cache.set(TOKEN, response.data.access_token);
      await showToast({ title: "Linkinize is Ready", message: "Enjoy lightening fast Bookmarks 🚀" });
      await launchCommand({ name: "synchronize", type: LaunchType.UserInitiated });
    })
    .catch(async function (error) {
      await showToast({
        title: "Authentication Failed",
        message: "Please check your credentials.",
        style: Toast.Style.Failure,
      });
      cache.clear();
    });
}

export async function logout(redirectToCommand = "index") {
  await showToast({ title: "Authentication Failed", message: "Please Login" });
  cache.clear();
  await launchCommand({ name: redirectToCommand, type: LaunchType.UserInitiated });
}

export async function handleAPIErrors(error: AxiosError) {
  switch (error.status) {
    case 401:
      await showToast({
        title: "Authentication Failed",
        message: "Please Login with your Linkinize credentials.",
        style: Toast.Style.Failure,
      });
      logout("index");
      break;
    case 500:
      await showToast({ title: "Error", message: "Something went wrong, Please try again in a bit." });
      break;
    case 404:
      await showToast({ title: "Error", message: "Not found, please try again.", style: Toast.Style.Failure });
      break;
  }
}
