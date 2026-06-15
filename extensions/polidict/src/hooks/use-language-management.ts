import type { CurrentLanguageActionsProps } from "../components/CurrentLanguageActions";
import { useSupportedLanguages } from "./use-supported-languages";
import { useUserLanguages } from "./use-user-languages";

type LanguageActionsProps = Omit<CurrentLanguageActionsProps, "onLanguageChanged">;

export function useLanguageManagement(authIdentity: string, isAuthenticated: boolean) {
  const {
    languages,
    currentLanguage,
    nativeLanguage,
    hasLanguages,
    isLoading,
    setCurrentLanguage,
    addLanguage,
    removeLanguage,
    setNativeLanguage,
    removeNativeLanguage,
    revalidate,
  } = useUserLanguages(authIdentity);
  const { supportedLanguages, isLoading: isLoadingSupportedLanguages } = useSupportedLanguages(
    isAuthenticated && hasLanguages,
  );

  const languageActions: LanguageActionsProps = {
    languages,
    currentLanguage,
    nativeLanguage,
    supportedLanguages,
    isLoadingSupportedLanguages,
    setCurrentLanguage,
    addLanguage,
    removeLanguage,
    setNativeLanguage,
    removeNativeLanguage,
  };

  return {
    languages,
    currentLanguage,
    nativeLanguage,
    hasLanguages,
    isLoading,
    setCurrentLanguage,
    addLanguage,
    removeLanguage,
    setNativeLanguage,
    removeNativeLanguage,
    revalidate,
    supportedLanguages,
    isLoadingSupportedLanguages,
    languageActions,
  };
}
