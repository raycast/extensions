import { getPreferenceValues } from "@raycast/api";
import { ReactNode, useContext } from "react";
import { Preferences } from "../types";
import useLoadable, { createLoadableContext, Loadable } from "./use-loader";

const PreferencesContext = createLoadableContext<Preferences>();

type PreferencesProviderProps = { children: ReactNode };
export function PreferencesProvider({ children }: PreferencesProviderProps): JSX.Element {
  const preferences = useLoadable(() => getPreferenceValues<Preferences>());

  return <PreferencesContext.Provider value={preferences}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): Loadable<Preferences> {
  const result = useContext(PreferencesContext);
  if (result == null) {
    throw new Error("usePreferences() must be used inside a <PreferencesProvider>");
  }
  return result;
}

export function usePreference<Key extends keyof Preferences>(key: Key): Loadable<Preferences[Key]> {
  const prefs = usePreferences();
  return { loading: prefs.loading, value: prefs.value?.[key] };
}
