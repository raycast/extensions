/** Native form fields adapted from raindrop-io BookmarkForm (MIT, 4cd99da7). */
import type { ReactNode } from "react";
import { Color, Form, Icon } from "@raycast/api";
import type { useForm } from "@raycast/utils";
import type { CollectionItem, FormValues, TagsResponse } from "../types";

type Props = {
  itemProps: Pick<
    ReturnType<typeof useForm<FormValues>>["itemProps"],
    "note" | "collection" | "tags" | "description" | "favorite"
  >;
  identity: ReactNode;
  edit?: boolean;
  collections?: CollectionItem[];
  tags?: TagsResponse["items"];
  collectionsError?: Error;
  tagsError?: Error;
};
export function BookmarkFields({
  itemProps,
  identity,
  edit,
  collections,
  tags,
  collectionsError,
  tagsError,
}: Props) {
  return (
    <>
      {identity}
      <Form.TextArea {...itemProps.note} title="Note" placeholder="Add a note" />
      {edit && (
        <Form.TextArea {...itemProps.description} title="Description" placeholder="Add a description" />
      )}
      {edit && <Form.Checkbox {...itemProps.favorite} label="Favorite" />}
      {collections ? (
        <Form.Dropdown {...itemProps.collection} title="Collection">
          <Form.Dropdown.Item value="-1" title="Unsorted" icon={Icon.Tray} />
          <Form.Dropdown.Section title="Collections">
            {collections.map(({ value, label, name, cover }) => (
              <Form.Dropdown.Item
                key={value}
                value={value}
                title={name && name !== label ? `${name} (${label})` : label}
                icon={
                  cover
                    ? {
                        source: cover,
                        tintColor: cover.startsWith("collection-icons/twemoji-")
                          ? undefined
                          : Color.PrimaryText,
                      }
                    : Icon.Folder
                }
              />
            ))}
          </Form.Dropdown.Section>
        </Form.Dropdown>
      ) : (
        <Form.Description
          title="Collection"
          text={
            collectionsError
              ? `Unavailable; kept unchanged. ${collectionsError.message}`
              : "Loading collections…"
          }
        />
      )}
      {tags ? (
        <Form.TagPicker {...itemProps.tags} title="Tags">
          {tags.map(({ _id, name }) => (
            <Form.TagPicker.Item key={_id} value={_id} title={name} />
          ))}
        </Form.TagPicker>
      ) : (
        <Form.Description
          title="Tags"
          text={tagsError ? `Unavailable; kept unchanged. ${tagsError.message}` : "Loading tags…"}
        />
      )}
    </>
  );
}
