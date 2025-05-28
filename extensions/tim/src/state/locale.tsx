import { runAppleScript, useCachedPromise } from "@raycast/utils";
import { createContext, useContext } from "react";

const DEFAULT_LOCALE = "en-US";
const LocaleContext = createContext<string>(DEFAULT_LOCALE);

export const LocaleProvider: React.FC<React.PropsWithChildren<object>> = ({ children }) => {
  const { data = DEFAULT_LOCALE } = useCachedPromise(getUserLocale);

  return <LocaleContext.Provider value={data}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => {
  const locale = useContext(LocaleContext);
  if (!locale) {
    throw new Error("useLocale without LocaleProvider in tree");
  }

  return locale;
};

async function getUserLocale() {
  try {
    const result = await runAppleScript('do shell script "defaults read NSGlobalDomain AppleLanguages"');
    const matches = result.match(/(?<=")(.*)(?=")/g);
    return matches?.at(0) ?? DEFAULT_LOCALE;
  } catch (error) {
    return DEFAULT_LOCALE;
  }
}
