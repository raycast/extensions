import { BookmarkForm } from "./components/BookmarkForm";
import { closeMainWindow, PopToRootType, showToast, Toast, LaunchProps } from "@raycast/api";
import { useRef } from "react";
function AddBookmarks(props: LaunchProps<{ launchContext?: { url?: string; title?: string } }>) {
  const defaultLink = props.launchContext?.url;
  const defaultValues = props.launchContext?.title ? { title: props.launchContext.title } : undefined;
  const toastRef = useRef<Toast | null>(null);

  return (
    <BookmarkForm
      defaultLink={defaultLink}
      defaultValues={defaultValues}
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
}

export default AddBookmarks;
