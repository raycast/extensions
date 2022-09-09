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

export const getAttribute = (data: string, key: string) => {
  return data.includes(`${key}=`) ? data.split(`${key}=`)[1].split("$break")[0].replace("\n", "") : "";
};

const MAX_TITLE_LENGTH = 30;
export const trimTitle = (title: string) => {
  if (title.length > MAX_TITLE_LENGTH) {
    title = `${title.substring(0, MAX_TITLE_LENGTH - 3)}...`;
  } else {
    title = title.padEnd(MAX_TITLE_LENGTH);
  }
  return title;
};
