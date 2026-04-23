import { Toast, closeMainWindow, PopToRootType, showToast } from "@raycast/api";
import { useRef } from "react";
import { BookmarkForm } from "./components/BookmarkForm";
import { useBrowserLink } from "./hooks/useBrowserLink";

const AddBrowserTab = () => {
  const { isLoading, data: link } = useBrowserLink();
  const toastRef = useRef<Toast | null>(null);

  return (
    <BookmarkForm
      isLoading={isLoading}
      defaultLink={link}
      onWillSave={() => {
        const toast = new Toast({ style: Toast.Style.Animated, title: "Adding Link..." });
        toastRef.current = toast;
        void toast.show();
      }}
      onSaved={async () => {
        await toastRef.current?.hide();
        toastRef.current = null;
        await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
        await showToast(Toast.Style.Success, "Link added");
      }}
      onError={(error) => {
        if (toastRef.current) {
          toastRef.current.style = Toast.Style.Failure;
          toastRef.current.title = "Error Adding Link";
          toastRef.current.message = error.message;
          return;
        }
        showToast(Toast.Style.Failure, "Error Adding Link", error.message);
      }}
    />
  );
};

export default AddBrowserTab;
