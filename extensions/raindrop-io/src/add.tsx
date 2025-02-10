import { showToast, Toast } from "@raycast/api";
import { CreateForm } from "./components/CreateForm";

const AddBookmarks = () => {
  return (
    <CreateForm
      onWillCreate={() => {
        showToast(Toast.Style.Animated, "Adding Link...");
      }}
      onCreated={() => {
        showToast(Toast.Style.Success, "Link Added");
      }}
      onError={() => {
        showToast(Toast.Style.Failure, "Error Adding Link");
      }}
    />
  );
};

export default AddBookmarks;
