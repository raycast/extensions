import { Toast, closeMainWindow, showHUD, showToast } from "@raycast/api";
import { CreateForm } from "./components/CreateForm";
import { useBrowserLink } from "./hooks/useBrowserLink";

const AddBrowserTab = () => {
  const { isLoading, data: link } = useBrowserLink();

  return (
    <CreateForm
      isLoading={isLoading}
      defaultLink={link}
      onWillCreate={() => {
        showToast(Toast.Style.Animated, "Adding Link...");
      }}
      onCreated={async () => {
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
