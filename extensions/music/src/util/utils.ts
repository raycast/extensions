import { showToast, showHUD, Toast, Clipboard, open, Color } from "@raycast/api";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";

import { ScriptError } from "./models";

export const handleError = (error: Error) =>
  TE.tryCatch(() => showToast(Toast.Style.Failure, error.name, error.message), E.toError);

export const handleTaskEitherError = <T, E extends Error>(te: TE.TaskEither<E, T>) =>
  pipe(
    te,
    TE.mapLeft((error) => {
      console.error(error);
      showToast({
        title: "Error",
        message: ScriptError.is(error) ? error.shortMessage : error.message,
        style: Toast.Style.Failure,
        primaryAction: {
          title: "Copy stack trace",
          onAction: () => Clipboard.copy(error.message),
          shortcut: {
            key: "enter",
            modifiers: ["shift"],
          },
        },
        secondaryAction: {
          title: "Report Issue",
          onAction: async () => {
            await open(
              "https://github.com/raycast/extensions/issues/new?assignees=&labels=extension%2C+bug&template=extension_bug_report.md&title=%5BMusic%5D"
            );
            showHUD(`Thanks for reporting this bug!`);
          },
          shortcut: {
            key: "enter",
            modifiers: ["cmd"],
          },
        },
      });
    })
  );

export const displayDuration = (duration: number) => {
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  return `${hours > 1 ? `${hours} hours ` : hours == 1 ? "1 hour " : ""}${minutes} min`;
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

export const AppleMusicColor = "#fb556d";
export const Icons = {
  Music: {
    source: {
      light: "../assets/icons/music-light.svg",
      dark: "../assets/icons/music-dark.svg",
    },
  },
  Star: {
    source: "../assets/icons/star.svg",
    tintColor: Color.PrimaryText,
  },
  StarFilled: {
    source: "../assets/icons/star-filled.svg",
    tintColor: Color.PrimaryText,
  },
  Heart: {
    source: "../assets/icons/heart.svg",
    tintColor: Color.PrimaryText,
  },
  HeartFilled: {
    source: "../assets/icons/heart-filled.svg",
    tintColor: Color.Red,
  },
  Repeat: {
    Off: {
      source: "../assets/icons/repeat.png",
      tintColor: Color.PrimaryText,
    },
    All: {
      source: "../assets/icons/repeat.png",
      tintColor: AppleMusicColor,
    },
    One: {
      source: "../assets/icons/repeat-one.png",
      tintColor: AppleMusicColor,
    },
  },
  Album: {
    source: "../assets/icons/album-icon.svg",
    tintColor: Color.PrimaryText,
  },
  Playlist: {
    source: "../assets/icons/playlist-icon.svg",
    tintColor: Color.PrimaryText,
  },
};
