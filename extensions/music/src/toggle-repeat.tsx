import * as music from "@/scripts";

import { showToast, Toast } from "@raycast/api";
import { pipe } from "fp-ts/lib/function";

import { handleTaskEitherError } from "./util/utils";

export default pipe(
  music.player.repeat.toggle,
  handleTaskEitherError("Failed to toggle repeat", (status) =>
    showToast(Toast.Style.Success, `Repeat ${status ? "On" : "Off"}`),
  ),
);
