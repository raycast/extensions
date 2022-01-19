import { getLocalStorageItem, setLocalStorageItem, showToast, ToastStyle } from "@raycast/api";
import fetch from "node-fetch";
import { URL } from "url";
import { BackendNotExistError, NoBackendError } from "./error";

const UNITS = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

function prettyBytes(n: number) {
  if (n < 1000) {
    return n + " B";
  }
  const exponent = Math.min(Math.floor(Math.log10(n) / 3), UNITS.length - 1);
  n = Number((n / Math.pow(1000, exponent)).toPrecision(3));
  const unit = UNITS[exponent];
  return n + " " + unit;
}

async function getCurrentBackend(): Promise<string | undefined> {
  const backend: string | undefined = await getLocalStorageItem("current");
  return backend;
}

async function getBackendSecret(backend: string): Promise<string | undefined> {
  const secret: string | undefined = await getLocalStorageItem(backend);
  return secret;
}

async function getCurrentBackendWithSecret() {
  const backend = await getCurrentBackend();
  if (backend) {
    const secret = await getBackendSecret(backend);
    if (secret == undefined) {
      throw BackendNotExistError;
    } else {
      return [backend, secret];
    }
  } else {
    throw NoBackendError;
  }
}

async function fetchBackend(endpoint: string) {
  const [backend, secret] = await getCurrentBackendWithSecret();
  const url = new URL(backend);
  const finalUrl = `${trimTrailingSlash(url.href)}${endpoint}`;
  return fetch(finalUrl, secret ? { headers: { Authorization: `Bearer ${secret}` } } : undefined);
}

async function buildWSURLBase(endpoint: string, params = {}) {
  const [backend, secret] = await getCurrentBackendWithSecret();
  const url = new URL(backend);
  url.protocol === "https:" ? (url.protocol = "wss:") : (url.protocol = "ws:");
  const ps = new URLSearchParams(params);
  ps.set("token", secret);
  const qs = "?" + ps.toString();
  return `${trimTrailingSlash(url.href)}${endpoint}${qs}`;
}

function trimTrailingSlash(s: string) {
  return s.replace(/\/$/, "");
}

async function setCurrentBackend(url: string) {
  await setLocalStorageItem("current", url);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function showFailureToast(title: string, error: any) {
  console.error(title, error);
  await showToast(ToastStyle.Failure, title, error instanceof Error ? error.message : error.toString());
}

function wait(duration: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

function pad0(number: number | string, len: number): string {
  let output = String(number);
  while (output.length < len) {
    output = "0" + output;
  }
  return output;
}

function formatDate(d: Date) {
  // 19-03-09 12:45
  const YY = d.getFullYear() % 100;
  const MM = pad0(d.getMonth() + 1, 2);
  const dd = pad0(d.getDate(), 2);
  const HH = pad0(d.getHours(), 2);
  const mm = pad0(d.getMinutes(), 2);
  const ss = pad0(d.getSeconds(), 2);
  return `${YY}-${MM}-${dd} ${HH}:${mm}:${ss}`;
}

function getFormatDateString() {
  return formatDate(new Date()).toString();
}

export {
  wait,
  getCurrentBackend,
  setCurrentBackend,
  prettyBytes,
  fetchBackend,
  buildWSURLBase,
  showFailureToast,
  getFormatDateString,
  getCurrentBackendWithSecret,
};
