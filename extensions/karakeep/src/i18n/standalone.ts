import { getPreferenceValues } from "@raycast/api";
import { Language, translations } from "./index";
import { translate } from "./translate";

/**
 * A `t()` for code that runs OUTSIDE a React component.
 *
 * `useTranslation()` is a hook, so plain modules (submitGuard) and no-view
 * commands (quickBookmark) can't use it. This reads the language preference
 * directly instead — same catalogs, same lookup, no hook.
 */
export function getTranslator() {
  const { language } = getPreferenceValues<Preferences>();
  const lang = (language as Language) || "en";
  return (key: string, params?: Record<string, string | number | undefined>) =>
    translate(translations[lang], key, params);
}
