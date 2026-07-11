import { MutatePromise } from "@raycast/utils";
import { StaticSite } from "../types";
import { Action, Alert, confirmAlert, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { makeRequest } from "../sevalla";

export default function DeleteStaticSiteAction({
  site,
  mutateSites,
}: {
  site: StaticSite;
  mutateSites: MutatePromise<StaticSite[]>;
}) {
  return (
    <Action
      icon={Icon.Trash}
      title="Delete Site"
      onAction={() =>
        confirmAlert({
          title: "Delete site",
          message: `If you delete ${site.display_name}, we will permanently remove all files and settings associated with the site. We cannot recover deleted sites.`,
          primaryAction: {
            style: Alert.ActionStyle.Destructive,
            title: "Delete site",
            async onAction() {
              const toast = await showToast(Toast.Style.Animated, "Deleting", site.display_name);
              try {
                const result = (await mutateSites(
                  makeRequest(`static-sites/${site.id}`, {
                    method: "DELETE",
                  }),
                  {
                    optimisticUpdate(data) {
                      return data.map((s) => (s.id === site.id ? { ...s, status: "deleting" } : s));
                    },
                  },
                )) as { transaction_id: string };
                toast.style = Toast.Style.Success;
                toast.title = "Deleted";
                toast.message = result.transaction_id;
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
      shortcut={Keyboard.Shortcut.Common.Remove}
    />
  );
}
