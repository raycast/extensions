import { CreateBookmarkForm } from "./components/create-bookmark-form";
import { useBrowserLink } from "./hooks/use-browser-link";

export default function saveBrowserTab() {
  const { isLoading, data: url } = useBrowserLink();
  return <CreateBookmarkForm isLoading={isLoading} url={url} />;
}
