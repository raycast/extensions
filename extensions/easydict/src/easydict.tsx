/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { LaunchProps } from "@raycast/api";

import { checkIfPreferredLanguagesConflict } from "@/features/search/LanguageConflictError";
import SearchWord from "@/features/search/SearchWord";
import { logTrace } from "@/shared/logger";

logTrace("Easydict", "module loaded");

export default function (props: LaunchProps<{ arguments: Arguments.Easydict }>) {
  const isConflict = checkIfPreferredLanguagesConflict();
  if (isConflict) {
    return isConflict;
  }

  const { queryText: initialQueryText } = props.arguments;

  return <SearchWord initialQueryText={initialQueryText} fallbackText={props.fallbackText} />;
}
