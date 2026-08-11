/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { Color, Icon, List } from "@raycast/api";

import { config } from "@/core/config";
import { logTrace } from "@/utils/logger";

/**
 * Check if preferred languages conflict (same language selected twice).
 * Returns an error List component if conflict, null otherwise.
 */
export function checkIfPreferredLanguagesConflict() {
  if (config.preferredLanguage1.youdaoLangCode === config.preferredLanguage2.youdaoLangCode) {
    logTrace("LanguageConflictError", "preferredLanguage1 and preferredLanguage2 are the same language");
    return (
      <List searchBarPlaceholder="Error">
        <List.Item
          title="Preferred Languages Conflict"
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          subtitle="Your First Language and Second Language must be different!"
        />
      </List>
    );
  }
  return null;
}
