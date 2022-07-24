import { List, showToast, Toast } from "@raycast/api";
import { useGetCategories } from "./client/client";
import Categoryitem from "./components/Categorytem";

export default function BrowseAll() {
  const response = useGetCategories();

  if (response.error) {
    showToast(Toast.Style.Failure, "Search has failed", response.error);
  }

  return (
    <List isLoading={response.isLoading} throttle>
      {response.result?.categories.items.map((c) => (
        <Categoryitem key={c.id} category={c} />
      ))}
    </List>
  );
}
