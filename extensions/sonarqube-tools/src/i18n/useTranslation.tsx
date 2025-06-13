/**
 * React hook for using translations in components
 * Simplified for English-only as per Raycast Store guidelines
 */
import { t, __ } from "./index";

/**
 * React hook to use translation in components
 * Returns the language (always "en") and translation functions
 */
export function useTranslation() {
  // Always English as per Raycast guidelines
  const language = "en";

  return {
    language,
    t,
    __,
  };
}

export default useTranslation;
