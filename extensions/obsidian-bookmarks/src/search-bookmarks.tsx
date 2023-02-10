import { ApplicationsProvider } from "./hooks/use-applications";
import { PreferencesProvider } from "./hooks/use-preferences";
import SearchBookmarks from "./views/SearchBookmarks";
import VaultInspector from "./views/VaultInspector";

export default function () {
  return (
    <ApplicationsProvider>
      <PreferencesProvider>
        <VaultInspector>
          <SearchBookmarks />
        </VaultInspector>
      </PreferencesProvider>
    </ApplicationsProvider>
  );
}
