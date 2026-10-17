import { getPreferenceValues } from "@raycast/api";

type Preferences = Preferences.RandomPlaceholderImage & Preferences.SearchPlaceholderImages;
export const {
  layout,
  columns,
  primaryAction,
  perPage,
  defaultWidth,
  defaultHeight,
  staticRandom,
  blur,
  jpg,
  grayscale,
  noCache,
} = getPreferenceValues<Preferences>();
