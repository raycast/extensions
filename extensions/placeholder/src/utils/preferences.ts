import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  layout: string;
  columns: string;
  primaryAction: string;
  perPage: string;
  defaultWidth: string;
  defaultHeight: string;
  staticRandom: boolean;
  blur: string;
  jpg: boolean;
  grayscale: boolean;
  noCache: boolean;
}
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
