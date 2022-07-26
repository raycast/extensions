import { showToast, showHUD, Toast, Clipboard, open } from "@raycast/api";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import * as A from "fp-ts/ReadonlyNonEmptyArray";
import { ScriptError } from './models';

export const handleError = (error: Error) =>
  TE.tryCatch(() => showToast(Toast.Style.Failure, error.name, error.message), E.toError);

export const handleTaskEitherError = <T, E extends Error>(te: TE.TaskEither<E, T>) =>
  pipe(
    te,
    TE.mapLeft((error) => {
      console.error(error);
      showHUD(`❌  Whoops! Something went wrong.`);
      showToast({
        title: 'Error',
        message: ScriptError.is(error) ? error.shortMessage : error.message,
        style: Toast.Style.Failure,
        primaryAction: {
          title: 'Copy stack trace',
          onAction: () => Clipboard.copy(error.message),
          shortcut: {
            key: 'enter',
            modifiers: ['shift']
          }
        },
        secondaryAction: {
          title: 'Report Issue',
          onAction: async () => {
            await open('https://github.com/raycast/extensions/issues/new?assignees=&labels=extension%2C+bug&template=extension_bug_report.md&title=%5BMusic%5D'),
            await showHUD(`📩  Thanks for reporting this bug!`);
          },
          shortcut: {
            key: 'enter',
            modifiers: ['cmd']
          }
        }
      })
    })
  );
