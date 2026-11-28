import { Action, ActionPanel, Alert, confirmAlert, Form, Icon, List, useNavigation, Keyboard } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useState } from "react";
import { z } from "zod";
import { getClient } from "../lib/api";
import { useMutation, usePaged } from "../lib/hooks";
import { collectionSchema, type Collection, type CollectionDetails, type Pen } from "../lib/models";
import { PenList } from "../search-pens";
import { CommonActions, EmptyView, LoadMoreItem } from "./common";

export function Collections({ pen }: { pen?: Pen }) {
  const [search, setSearch] = useState("");
  const { data, error, isLoading, pagination, revalidate } = usePaged(
    "collections?per_page=100&sort=updated",
    collectionSchema,
  );
  const mutation = useMutation();
  const { pop } = useNavigation();
  const collections = data?.filter((collection) =>
    `${collection.title} ${collection.description}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <List
      navigationTitle={pen ? `Add “${pen.title}” to Collection` : "Search Collections"}
      isLoading={isLoading || mutation.isLoading}
      filtering={false}
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Search loaded collections…"
      pagination={pagination}
    >
      <EmptyView error={error} title="No Collections Found" description="Create a collection to organize your Pens.">
        <Action.Push title="Create Collection" icon={Icon.Plus} target={<CollectionForm onSaved={revalidate} />} />
        <CommonActions refresh={revalidate} />
      </EmptyView>
      {collections?.map((collection) => (
        <List.Item
          key={collection.id}
          title={collection.title}
          subtitle={collection.description}
          icon={Icon.Folder}
          accessories={[{ text: `${collection.items_count} Pens` }, { tag: collection.access }]}
          actions={
            <ActionPanel>
              {pen ? (
                <Action
                  title="Add Pen to Collection"
                  icon={Icon.Plus}
                  onAction={() =>
                    mutation.run(
                      "Pen added to collection",
                      () => getClient().addToCollection(collection.id, pen.id),
                      () => pop(),
                    )
                  }
                />
              ) : (
                <Action.Push title="Browse Pens" icon={Icon.Code} target={<PenList collection={collection} />} />
              )}
              <Action.OpenInBrowser title="Open Collection in CodePen" url={collection.url} />
              <Action.CopyToClipboard title="Copy Collection URL" content={collection.url} />
              {!pen && (
                <>
                  <Action.Push
                    title="Edit Collection"
                    icon={Icon.Pencil}
                    target={<CollectionForm collection={collection} onSaved={revalidate} />}
                  />
                  <Action
                    title="Trash Collection"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      if (
                        await confirmAlert({
                          title: "Trash Collection?",
                          message: `Trash “${collection.title}”? Its Pens will be kept. You can restore the collection on CodePen for 3 days.`,
                          primaryAction: { title: "Trash Collection", style: Alert.ActionStyle.Destructive },
                        })
                      )
                        await mutation.run(
                          "Collection moved to trash",
                          () => getClient().deleteCollection(collection.id),
                          revalidate,
                        );
                    }}
                  />
                </>
              )}
              <Action.Push
                title="Create Collection"
                icon={Icon.Plus}
                target={<CollectionForm onSaved={revalidate} />}
                shortcut={Keyboard.Shortcut.Common.New}
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

export function CollectionPicker({ pen }: { pen: Pen }) {
  return <Collections pen={pen} />;
}

export function CollectionForm({ collection, onSaved }: { collection?: Collection; onSaved?: () => void }) {
  const mutation = useMutation();
  const { pop, push } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ title: string; description: string; access: string }>({
    initialValues: {
      title: collection?.title ?? "",
      description: collection?.description ?? "",
      access: collection?.access ?? "default",
    },
    validation: { title: FormValidation.Required },
    onSubmit: async (values) => {
      const access = values.access === "default" ? undefined : z.enum(["Public", "Private"]).parse(values.access);
      const details: CollectionDetails = collection
        ? {
            ...(values.title !== collection.title ? { title: values.title } : {}),
            ...(values.description !== collection.description ? { description: values.description } : {}),
            ...(access && access !== collection.access ? { access } : {}),
          }
        : { title: values.title, description: values.description, access };
      if (collection && Object.keys(details).length === 0) {
        onSaved?.();
        pop();
        return;
      }
      await mutation.run(
        collection ? "Collection updated" : "Collection created",
        () => getClient().saveCollection(details, collection?.id),
        (result) => {
          onSaved?.();
          if (onSaved) pop();
          else push(<PenList collection={result} />);
        },
      );
    },
  });
  return (
    <Form
      navigationTitle={collection ? "Edit Collection" : "Create Collection"}
      isLoading={mutation.isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={collection ? "Save Collection" : "Create Collection"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="Creative coding" {...itemProps.title} />
      <Form.TextArea title="Description" {...itemProps.description} />
      <Form.Dropdown title="Privacy" {...itemProps.access}>
        {!collection && <Form.Dropdown.Item value="default" title="Account Default" />}
        <Form.Dropdown.Item value="Public" title="Public" />
        <Form.Dropdown.Item value="Private" title="Private (PRO)" />
      </Form.Dropdown>
    </Form>
  );
}
