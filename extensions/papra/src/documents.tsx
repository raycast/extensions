import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { Document, Organization } from "./types";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { papra, PAPRA_COLOR } from "./papra";
import fs from "fs";
import path from "path";
import { filesize } from "filesize";
import { useState } from "react";
import OpenInPapra from "./open-in-papra";

const getDocumentIcon = (mimeType: Document["mimeType"]) => {
  if (mimeType.startsWith("image/")) return Icon.Image;
  return Icon.CodeBlock;
};

export default function Documents({ organization }: { organization: Organization }) {
  const [searchText, setSearchText] = useState("");
  const {
    isLoading,
    data: documents,
    mutate,
  } = useCachedPromise(
    async (organizationId: string, query: string) => {
      if (!query.trim()) {
        const res = await papra.documents.list({ organizationId });
        return res.documents;
      }
      const res = await papra.documents.search({ organizationId, query });
      return res.documents.map((document) => ({
        id: document.id,
        createdAt: document.created_at,
        originalSize: document.original_size,
        name: document.name,
        mimeType: document.mime_type,
        tags: document.tags,
      }));
    },
    [organization.id, searchText],
    { initialData: [] },
  );

  const confirmAndDelete = (document: Document) => {
    confirmAlert({
      title: "Delete Document",
      message: `Are you sure you want to delete ${document.name}?`,
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete Document",
        async onAction() {
          const toast = await showToast(Toast.Style.Animated, "Deleting", document.name);
          try {
            await mutate(papra.documents.delete({ organizationId: organization.id, id: document.id }), {
              optimisticUpdate(data) {
                return data.filter((d) => d.id !== document.id);
              },
              shouldRevalidateAfter: false,
            });
            toast.style = Toast.Style.Success;
            toast.title = "Deleted";
          } catch (error) {
            toast.style = Toast.Style.Failure;
            toast.title = "Failed";
            toast.message = `${error}`;
          }
        },
      },
    });
  };

  const buildAccessories = (document: Document) => {
    const accessories: List.Item.Accessory[] = [];
    document.tags.forEach((tag) => accessories.push({ tag: { value: tag.name, color: tag.color } }));
    accessories.push({ date: new Date(document.createdAt) });
    return accessories;
  };

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Organizations / ${organization.name} / Documents`}
      onSearchTextChange={setSearchText}
      throttle
    >
      {!isLoading && !documents.length ? (
        <List.EmptyView
          icon={Icon.Cloud}
          title="No documents"
          description="There are no documents in this organization yet. Start by uploading some documents."
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Upload}
                title="Import Document"
                target={<ImportDocument organization={organization} />}
                onPop={mutate}
              />
            </ActionPanel>
          }
        />
      ) : (
        documents.map((document) => (
          <List.Item
            key={document.id}
            icon={{ source: getDocumentIcon(document.mimeType), tintColor: PAPRA_COLOR }}
            title={document.name}
            subtitle={`${filesize(document.originalSize)} - ${document.name.split(".").at(-1)}`}
            accessories={buildAccessories(document)}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Info}
                  title="Document Details"
                  target={<DocumentDetails organization={organization} document={document} />}
                />
                <Action.Push
                  icon={Icon.Upload}
                  title="Import Document"
                  target={<ImportDocument organization={organization} />}
                  onPop={mutate}
                />
                <OpenInPapra route={`documents/${document.id}`} />
                <Action
                  icon={Icon.Trash}
                  title="Delete Document"
                  onAction={() => confirmAndDelete(document)}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function ImportDocument({ organization }: { organization: Organization }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ files: string[] }>({
    async onSubmit(values) {
      const file = values.files[0];
      if (!(fs.existsSync(file) && fs.lstatSync(file).isFile())) throw new Error("File Error");
      const toast = await showToast(Toast.Style.Animated, "Uploading", file);

      const fileBuffer = fs.readFileSync(file);
      const fileName = path.basename(file);
      const fileBlob = new Blob([fileBuffer]);

      const formData = new FormData();
      formData.append("file", fileBlob, fileName);
      try {
        await papra.documents.create({ organizationId: organization.id, body: formData });
        toast.style = Toast.Style.Success;
        toast.title = "Uploaded";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      files: FormValidation.Required,
    },
  });
  return (
    <Form
      navigationTitle={`Organizations / ${organization.name} / Documents / Upload`}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Upload} title="Upload Document" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker title="File" allowMultipleSelection={false} canChooseDirectories={false} {...itemProps.files} />
    </Form>
  );
}

function DocumentDetails({ organization, document }: { organization: Organization; document: Document }) {
  const { isLoading, data: content } = useCachedPromise(
    async (organizationId: string, id: string) => {
      const res = await papra.documents.get({ organizationId, id });
      return res.document.content;
    },
    [organization.id, document.id],
  );
  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={`... / ${organization.name} / Documents / ${document.name}`}
    >
      <List.Item
        icon={Icon.Info}
        title="Info"
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="ID" text={document.id} />
                <List.Item.Detail.Metadata.Label title="Name" text={document.name} />
                <List.Item.Detail.Metadata.Label title="Type" text={document.mimeType} />
                <List.Item.Detail.Metadata.Label title="Size" text={filesize(document.originalSize)} />
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
      <List.Item
        icon={Icon.Text}
        title="Content"
        accessories={[
          {
            icon: Icon.Info,
            tooltip:
              "The content of the document is automatically extracted from the document on upload. It is only used for search and indexing purposes.",
          },
        ]}
        detail={
          <List.Item.Detail
            markdown={content || "_This document has no extracted content, you can set it manually here._"}
          />
        }
      />
    </List>
  );
}
