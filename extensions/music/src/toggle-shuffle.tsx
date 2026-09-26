import { showToast, Toast } from "@raycast/api";
import { pipe } from "fp-ts/lib/function";

import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

export default pipe(
  music.player.shuffle.toggle,
  handleTaskEitherError("Failed to toggle shuffle", (status) =>
    showToast(Toast.Style.Success, `Shuffle ${status ? "On" : "Off"}`),
  ),
);
