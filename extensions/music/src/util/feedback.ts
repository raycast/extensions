import { showHUD } from "@raycast/api";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

export const hud =
  (text: string) =>
  <T, E extends Error>(te: TE.TaskEither<E, T>) =>
    pipe(
      te,
      TE.chain(() => TE.tryCatch(() => showHUD(text), E.toError)),
    );
