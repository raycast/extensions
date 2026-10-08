import { useCachedState } from "@raycast/utils";

import { PopiconVariant } from "../enums/popicon-variant";

function usePopiconVariant(initialVariant: PopiconVariant) {
  return useCachedState<PopiconVariant>("popicons-variant", initialVariant);
}

export { usePopiconVariant };
