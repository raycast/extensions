import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useContext } from "react";
import { sdk, SDKContext } from "../sdk";

export default function Files({ bucket }: { bucket: sdk.Models.Bucket }) {
  const { storage } = useContext(SDKContext);
  const { isLoading, data: files } = useCachedPromise(
    async () => {
      const res = await storage.listFiles(bucket.$id);
      return res.files;
    },
    [],
    {
      initialData: [],
    },
  );
  return (
    <List isLoading={isLoading}>
      {!isLoading && !files.length ? (
        <List.EmptyView
          title="Create your first file"
          description="Need a hand? Learn more in our documentation."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Documentation"
                url="https://appwrite.io/docs/products/storage/upload-download"
              />
            </ActionPanel>
          }
        />
      ) : (
        files.map((file) => <List.Item key={file.$id} icon={Icon.Document} title={file.$id} />)
      )}
    </List>
  );
}
