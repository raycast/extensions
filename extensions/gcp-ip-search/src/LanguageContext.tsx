import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { LocalStorage } from "@raycast/api";
import { Language, getTranslations, Translations } from "./locales";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load language preference from storage
  useEffect(() => {
    (async () => {
      const storedLang = await LocalStorage.getItem<Language>("language");
      if (storedLang && (storedLang === "en" || storedLang === "zh-TW")) {
        setLanguageState(storedLang);
      }
      setIsLoaded(true);
    })();
  }, []);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    await LocalStorage.setItem("language", lang);
  };

  const t = getTranslations(language);

  if (!isLoaded) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
