import { List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { Directory } from "./directory";
import { create_or_update_db } from "./database";

export default function Command() {
  const { data, error } = usePromise(async () => {
    return await create_or_update_db();
  });

  if (error) {
    showToast(Toast.Style.Failure, "Microsoft OneNote is not installed");
    return (
      <List>
        <List.EmptyView
          icon={"😭"}
          title={"Microsoft OneNote is not installed"}
          description={"You need to install Microsoft OneNote in order to use this extension."}
        />
      </List>
    );
  }
  if (!data) return <List isLoading={true} />;

  return <Directory />;
}
