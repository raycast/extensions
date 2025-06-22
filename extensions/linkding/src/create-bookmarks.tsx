import { getPreferenceValues } from "@raycast/api";
import { CreateBookmarkForm } from "./components/create-bookmark-form";
import { useBrowserLink } from "./hooks/use-browser-link";

const CreateBookmarkWithBrowserLink = () => {
  const { isLoading, data: url } = useBrowserLink({ ignoreErrors: true });
  return <CreateBookmarkForm url={url} isLoading={isLoading} />;
};

export default function createBookmarks() {
  const { useCurrentBrowserTab } = getPreferenceValues<Preferences.CreateBookmarks>();
  return useCurrentBrowserTab ? <CreateBookmarkWithBrowserLink /> : <CreateBookmarkForm />;
}
