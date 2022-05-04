import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { runAppleScript } from "run-applescript";

export const tell = (application: string, command: string) =>
  TE.tryCatch(() => runAppleScript(`tell application "${application}" to ${command}`), E.toError);

export const runScript = (command: string) => TE.tryCatch(() => runAppleScript(command), E.toError);
