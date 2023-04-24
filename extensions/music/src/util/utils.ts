import { showToast, showHUD, Toast, Clipboard, open } from "@raycast/api";
import { environment } from "@raycast/api";
import { pipe } from "fp-ts/lib/function";

import * as TE from "./fp/task-either";

export const isMenuBar = () => environment.commandMode == "menu-bar";

type VoidFn<T> = (arg: T) => void;

export interface ScriptError extends Error {
  shortMessage: string;
  command: string;
  failed: boolean;
}

export const ScriptError = {
  is: (error: Error): error is ScriptError => "shortMessage" in error,
};

export function displayError(error: Error | ScriptError) {
  const message = ScriptError.is(error) ? error.shortMessage : error.message;

  if (isMenuBar()) {
    showHUD(`Error: ${message}`);
    return;
  }

  showToast({
    title: "Error",
    message,
    style: Toast.Style.Failure,
    primaryAction: {
      title: "Copy stack trace",
      onAction: () => Clipboard.copy(error.stack ?? error.message),
      shortcut: {
        key: "enter",
        modifiers: ["shift"],
      },
    },
    secondaryAction: {
      title: "Report Issue",
      onAction: async () => {
        await open(
          `https://github.com/raycast/extensions/issues/new?template=extension_bug_report.yml&extension-url=https%3A%2F%2Fraycast.com%2Ffedevitaledev%2Fmusic&description=${encodeURIComponent(
            error.message
          )}&title=${encodeURIComponent("[Music]: ")}`
        );

        await showHUD(`Thanks for reporting this bug!`);
      },
      shortcut: {
        key: "enter",
        modifiers: ["cmd"],
      },
    },
  });
}

/**
 *
 * @param error - Function or error message
 * @param success - Function or success message
 */
function handleTaskEitherError<E extends Error, T>(error?: string | VoidFn<E>, success?: string | VoidFn<T>) {
  const onSuccess = typeof success === "string" ? () => showHUD(success) : success;
  const onError = typeof error === "string" ? () => undefined : error;

  return (te: TE.TaskEither<E, T>) =>
    pipe(te, TE.tap(onSuccess), TE.tapLeft(onError), TE.tapLeft(console.error), TE.mapLeft(displayError));
}

export { handleTaskEitherError };

export const minMax = (min: number, max: number) => (value: number) => Math.max(Math.min(value, max), min);
