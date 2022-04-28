import { readFile, stat } from "fs/promises";

import { showToast, Toast, Clipboard as RaycastClipboard } from "@raycast/api";

import * as Clipboard from "./clipboard";

/**
 * An exception that can be thrown to display a toast.
 * The entrypoint of the command must be wrapped by the {@link entrypoint} function in this file.
 */
export class ToastException extends Error {}

/**
 * Wraps an entrypoint function, allowing {@link ToastException}s to stop execution and show a toast.
 * @param fn The function to wrap.
 */
export function entrypoint(fn: () => Promise<any>): () => Promise<any> {
  return async function () {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof ToastException) {
        return showToast({
          title: "Error",
          message: e.message,
          style: Toast.Style.Failure,
        });
      }

      throw e;
    }
  };
}

/**
 * Ignores exceptions from a promise, simply returning `undefined` instead.
 * @param promise The promise.
 */
async function ignoreExceptions<T>(promise: Promise<T>): Promise<undefined | T> {
  try {
    return await promise;
  } catch (e) {
    return undefined;
  }
}

/**
 * Gets the input from the clipboard.
 *
 * Copied files will be loaded into memory as a {@link Buffer}, and text will be copied into memory directly as UTF-8.
 */
export async function getInput(): Promise<Buffer> {
  const types = await Clipboard.types();

  // If a file is copied, try to read that.
  if (types.has(Clipboard.DataType.File)) {
    const filePath = await Clipboard.read(Clipboard.DataType.File);
    const fileStat = await ignoreExceptions(stat(filePath));

    if (fileStat !== undefined) {
      if (!fileStat.isFile()) {
        throw new ToastException("Clipboard contains directory.");
      }

      return await readFile(filePath);
    }
  }

  // If plain text is copied, use that.
  if (types.has(Clipboard.DataType.Text)) {
    return Buffer.from(await Clipboard.read(Clipboard.DataType.Text), "utf8");
  }

  // If none of the above, unsupported.
  throw new ToastException("Clipboard contents unsupported.");
}

/**
 * Copies the output hash to the clipboard.
 *
 * @param output The output string.
 * @param title The title of the toast.
 */
export async function setOutput(output: string, title: string) {
  await RaycastClipboard.copy(output);
  await showToast({
    title: title,
    message: "Copied output to clipboard",
  });
}
