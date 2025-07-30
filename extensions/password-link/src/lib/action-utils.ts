import { Clipboard, showToast, Toast, open } from "@raycast/api";
import { SecretRequest } from "../types";
import { generateSecretRequestUrl } from "./utils";

/**
 * Copy secret request URL to clipboard
 * @param request - Secret request object
 */
export async function copyRequestUrl(request: SecretRequest) {
  const requestUrl = generateSecretRequestUrl(request.id);
  await Clipboard.copy(requestUrl);
  await showToast({
    style: Toast.Style.Success,
    title: "URL Copied",
    message: "Secret request URL copied to clipboard",
  });
}

/**
 * Open secret request in browser
 * @param request - Secret request object
 */
export async function openRequest(request: SecretRequest) {
  const requestUrl = generateSecretRequestUrl(request.id);
  await open(requestUrl);
}

/**
 * Generic copy URL function
 * @param url - URL to copy
 * @param title - Toast title
 * @param message - Toast message
 */
export async function copyUrl(url: string, title: string, message: string) {
  await Clipboard.copy(url);
  await showToast({
    style: Toast.Style.Success,
    title,
    message,
  });
}

/**
 * Generic open URL function
 * @param url - URL to open
 */
export async function openUrl(url: string) {
  await open(url);
}
