import { setColorFilterType, ColorFilterType } from "./color-filters";

export default async function Command() {
  await setColorFilterType(ColorFilterType.ColorTint);
}
