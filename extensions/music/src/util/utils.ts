import { showToast, showHUD, Toast } from "@raycast/api";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import * as A from "fp-ts/ReadonlyNonEmptyArray";

export const handleError = (error: Error) =>
  TE.tryCatch(() => showToast(Toast.Style.Failure, error.name, error.message), E.toError);

export const handleTaskEitherError = (te: TE.TaskEither<Error, unknown>) =>
  pipe(
    te,
    TE.mapLeft((error) => {
      console.error(error);
      showHUD(`❌ An error is occurred.`);
    })
  );
