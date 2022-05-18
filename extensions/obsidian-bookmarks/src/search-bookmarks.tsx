import { ApplicationsProvider } from "./hooks/use-applications";
import { PreferencesProvider } from "./hooks/use-preferences";
import SearchBookmarks from "./views/SearchBookmarks";

export default function () {
  return (
    <ApplicationsProvider>
      <PreferencesProvider>
        <SearchBookmarks />
      </PreferencesProvider>
    </ApplicationsProvider>
  );
}
