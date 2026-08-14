import { Detail, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import { LanguageSetup } from "./language-setup";
import { getLanguagePreferences, LanguagePreferences } from "./preferences";

export default function Command() {
  const [preferences, setPreferences] = useState<LanguagePreferences | null>();

  useEffect(() => {
    void getLanguagePreferences().then((value) => setPreferences(value || null));
  }, []);

  if (preferences === undefined) {
    return <Detail isLoading markdown="# Loading language settings…" />;
  }

  return (
    <LanguageSetup
      initialPreferences={preferences || undefined}
      onSaved={async () => {
        await popToRoot({ clearSearchBar: true });
      }}
    />
  );
}
