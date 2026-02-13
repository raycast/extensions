declare module "swift:../swift/color-picker" {
  import type { PickedColor } from "./types";
  export function pickColor(): Promise<PickedColor | undefined>;
}
