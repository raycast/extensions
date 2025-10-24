import { Action, Alert, confirmAlert, Icon, showToast, Toast } from "@raycast/api";
import { makeRequest } from "../sevalla";
import { Database } from "../types";
import { MutatePromise } from "@raycast/utils";

export default function DeleteDatabaseAction({
  database,
  mutateDatabases,
}: {
  database: Database;
  mutateDatabases: MutatePromise<Database[]>;
}) {
  return (
    <Action
      icon={Icon.Trash}
      title="Delete Database"
      onAction={() =>
        confirmAlert({
          title: "Delete database",
          message: `By deleting ${database.display_name}, all of its data will be destroyed. This is not recoverable.`,
          primaryAction: {
            style: Alert.ActionStyle.Destructive,
            title: "Delete database",
            async onAction() {
              const toast = await showToast(Toast.Style.Animated, "Deleting", database.display_name);
              try {
                const result = (await mutateDatabases(
                  makeRequest(`databases/${database.id}`, {
                    method: "DELETE",
                  }),
                  {
                    optimisticUpdate(data) {
                      return data.map((db) => (db.id === database.id ? { ...db, status: "deleting" } : db));
                    },
                  },
                )) as { message: string };
                toast.style = Toast.Style.Success;
                toast.title = "Deleted";
                toast.message = result.message;
              } catch (error) {
                toast.style = Toast.Style.Failure;
                toast.title = "Failed";
                toast.message = `${error}`;
              }
            },
          },
        })
      }
      style={Action.Style.Destructive}
    />
  );
}
