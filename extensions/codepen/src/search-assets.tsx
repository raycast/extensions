import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Detail,
  Form,
  Icon,
  List,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { FormValidation, useForm, usePromise } from "@raycast/utils";
import { useState } from "react";
import { getClient } from "./lib/api";
import { useMutation, usePaged } from "./lib/hooks";
import { assetSchema, type Asset } from "./lib/models";
import { codeMarkdown, CommonActions, EmptyView, LoadMoreItem } from "./components/common";
import UploadAsset from "./upload-asset";

export default function Command() {
  const [search, setSearch] = useState("");
  const { data, error, isLoading, pagination, revalidate } = usePaged("assets?per_page=100&sort=updated", assetSchema);
  const mutation = useMutation();
  return (
    <List
      isLoading={isLoading || mutation.isLoading}
      filtering={false}
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Search loaded assets by filename…"
      pagination={pagination}
    >
      <EmptyView
        error={error}
        title="No Assets Found"
        description="Upload a file to CodePen Asset Hosting. A PRO plan is required."
      >
        <Action.Push title="Upload Asset" icon={Icon.Upload} target={<UploadAsset onUploaded={revalidate} />} />
        <CommonActions refresh={revalidate} />
      </EmptyView>
      {data
        ?.filter((asset) => asset.filename.toLowerCase().includes(search.toLowerCase()))
        .map((asset) => (
          <List.Item
            key={asset.id}
            title={asset.filename}
            icon={Icon.Document}
            accessories={[{ date: new Date(asset.updated_at), tooltip: "Last Updated" }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Asset URL" content={asset.url} />
                <Action.OpenInBrowser title="Open Asset" url={asset.url} />
                {!asset.is_binary && (
                  <Action.Push title="View Source" icon={Icon.Code} target={<AssetSource asset={asset} />} />
                )}
                <Action.Push
                  title="Rename Asset"
                  icon={Icon.Pencil}
                  target={<RenameAsset asset={asset} onSaved={revalidate} />}
                />
                <Action.Push
                  title="Upload Asset"
                  icon={Icon.Upload}
                  target={<UploadAsset onUploaded={revalidate} />}
                  shortcut={Keyboard.Shortcut.Common.New}
                />
                <Action
                  title="Delete Asset"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    if (
                      await confirmAlert({
                        title: "Permanently Delete Asset?",
                        message: `Delete “${asset.filename}” from storage? Existing links to this asset will stop working. This cannot be undone.`,
                        primaryAction: { title: "Delete Asset", style: Alert.ActionStyle.Destructive },
                      })
                    )
                      await mutation.run("Asset deleted", () => getClient().deleteAsset(asset.id), revalidate);
                  }}
                />
                <CommonActions refresh={revalidate} />
              </ActionPanel>
            }
          />
        ))}
      <LoadMoreItem hasMore={pagination?.hasMore ?? false} onLoadMore={() => pagination?.onLoadMore()} />
    </List>
  );
}

function AssetSource({ asset }: { asset: Asset }) {
  const { data, error, isLoading, revalidate } = usePromise((id: string) => getClient().getAsset(id), [asset.id]);
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={asset.filename}
      markdown={
        data?.content != null
          ? codeMarkdown(data.content, data.filename)
          : (error?.message ?? (data ? "No text content available." : "Loading source…"))
      }
      actions={
        <ActionPanel>
          {data?.content != null && <Action.CopyToClipboard title="Copy Source" content={data.content} />}
          <Action.OpenInBrowser title="Open Asset" url={asset.url} />
          <CommonActions refresh={revalidate} />
        </ActionPanel>
      }
    />
  );
}

function RenameAsset({ asset, onSaved }: { asset: Asset; onSaved: () => void }) {
  const { pop } = useNavigation();
  const mutation = useMutation();
  const { handleSubmit, itemProps } = useForm<{ filename: string }>({
    initialValues: { filename: asset.filename },
    validation: { filename: FormValidation.Required },
    onSubmit: async ({ filename }) => {
      await mutation.run(
        "Asset renamed",
        () => getClient().renameAsset(asset.id, filename),
        () => {
          onSaved();
          pop();
        },
      );
    },
  });
  return (
    <Form
      isLoading={mutation.isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename Asset" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Filename" {...itemProps.filename} />
      <Form.Description text="Renaming changes the asset URL. Update any Pens or other pages that reference the old URL." />
    </Form>
  );
}
