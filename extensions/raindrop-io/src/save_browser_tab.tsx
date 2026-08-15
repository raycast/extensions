import { Toast, closeMainWindow, showHUD, showToast } from "@raycast/api";
import { BookmarkForm } from "./components/BookmarkForm";
import { useBrowserLink } from "./hooks/useBrowserLink";

const AddBrowserTab = () => {
  const { isLoading, data: link } = useBrowserLink();

  return (
    <BookmarkForm
      isLoading={isLoading}
      defaultLink={link}
      onWillSave={() => {
        showToast(Toast.Style.Animated, "Adding Link...");
      }}
      onSaved={async () => {
        await closeMainWindow({ clearRootSearch: true });
        await showHUD("Link added");
      }}
      onError={() => {
        showToast(Toast.Style.Failure, "Error Adding Link");
      }}
    />
  );
};

export default AddBrowserTab;
