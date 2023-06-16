import { pipe } from "fp-ts/lib/function";

import { SFSymbols } from "./util/models";
import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

export default pipe(
  music.currentTrack.addToLibrary,
  handleTaskEitherError(SFSymbols.WARNING + " Failed to Add to Library", SFSymbols.ADD_TO_LIBRARY + " Added to library")
);
