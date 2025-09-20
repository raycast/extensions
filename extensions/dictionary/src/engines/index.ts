export type { EngineID, DepEngineID, EngineHookProps } from "./types";
import { default as UrbanListEngine, UrbanDefineEngine } from "./urban";
import { default as GooglEngine } from "./googl";
import GoogleApiEngine from "./googlApi";
import YoudaoApiEngine from "./youdaoApi";

import { EngineID } from "./types";
const getEngine = (id: EngineID | undefined) => {
  switch (id) {
    case "urban":
      return UrbanListEngine;
    case "urbandefine":
      return UrbanDefineEngine;
    case "googlapi":
      return GoogleApiEngine;
    case "youdaoapi":
      return YoudaoApiEngine;
    default:
      return GooglEngine;
  }
};
export default getEngine;
