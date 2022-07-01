import { showToast, showHUD, Toast, getPreferenceValues } from "@raycast/api";
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

export const displayDuration = (duration: number) => {
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  return `${hours > 1 ? `${hours} hours ` : hours == 1 ? "1 hour " : ""}${minutes} min`;
};

const preferences = getPreferenceValues();
const { primaryPlaylistAction, secondaryPlaylistAction } = preferences;

export const getPlaylistPrimaryAction = (): string => {
  return primaryPlaylistAction;
};

export const getPlaylistSecondaryAction = (): string => {
  return secondaryPlaylistAction;
};
