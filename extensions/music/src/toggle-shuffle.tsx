import { showToast, Toast } from "@raycast/api";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

import { SFSymbols } from "./util/models";
import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

export default pipe(
  music.player.shuffle.toggle,
  TE.chain(() => music.player.shuffle.get),
  handleTaskEitherError(`${SFSymbols.WARNING} Failed to toggle shuffle`, (status) =>
    showToast(Toast.Style.Success, `Shuffle ${status ? "On" : "Off"}`)
  )
)();
