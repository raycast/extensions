import { environment } from "@raycast/api";
import path from "path";
import { PopiconVariant } from "../enums/popicon-variant";
import { exhaustive } from "./exhaustive";

export function getPopiconStoragePath(variant: PopiconVariant): string {
  switch (variant) {
    case PopiconVariant.Line:
      return path.join(environment.assetsPath, "offline-popicons", "line.json");
    case PopiconVariant.Solid:
      return path.join(environment.assetsPath, "offline-popicons", "solid.json");
    case PopiconVariant.Duotone:
      return path.join(environment.assetsPath, "offline-popicons", "duotone.json");
    default:
      return exhaustive(variant);
  }
}
