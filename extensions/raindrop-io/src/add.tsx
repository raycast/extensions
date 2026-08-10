import { BookmarkForm } from "./components/BookmarkForm";
import { showToast, Toast, LaunchProps } from "@raycast/api";

function AddBookmarks(props: LaunchProps<{ launchContext?: { url?: string; title?: string } }>) {
  const defaultLink = props.launchContext?.url;
  const defaultValues = props.launchContext?.title ? { title: props.launchContext.title } : undefined;

  return (
    <BookmarkForm
      defaultLink={defaultLink}
      defaultValues={defaultValues}
      onWillSave={() => {
        showToast(Toast.Style.Animated, "Adding Link...");
      }}
      onSaved={() => {
        showToast(Toast.Style.Success, "Link Added");
      }}
      onError={() => {
        showToast(Toast.Style.Failure, "Error Adding Link");
      }}
    />
  );
}

export default AddBookmarks;
