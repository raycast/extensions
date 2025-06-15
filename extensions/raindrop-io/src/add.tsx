import { showToast, Toast } from "@raycast/api";
import { BookmarkForm } from "./components/BookmarkForm";

const AddBookmarks = () => {
  return (
    <BookmarkForm
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
};

export default AddBookmarks;
