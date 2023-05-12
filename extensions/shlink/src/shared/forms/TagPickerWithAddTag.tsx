import { Form, Icon, showToast, Toast } from "@raycast/api";
import { forwardRef, Ref, useState } from "react";
import { hashedHSL } from "../utils";
import { useApiFetchPagination } from "../api";

async function addedTagHud(tag: string, setTags: (tags: string[]) => void, tags: string[]) {
  await showToast({
    title: `Tag \`${tag}\` added`,
    style: Toast.Style.Success,
    primaryAction: {
      shortcut: { key: "t", modifiers: ["cmd", "shift"] },
      title: "Remove this tag",
      onAction: async () => {
        setTags(tags.filter((t) => t !== tag));
        await removedTagHud(tag, setTags, tags);
      },
    },
  });
}

async function removedTagHud(tag: string, setTags: (tags: string[]) => void, tags: string[]) {
  await showToast({
    title: `Tag \`${tag}\` removed`,
    style: Toast.Style.Success,
    primaryAction: {
      shortcut: { key: "t", modifiers: ["cmd", "shift"] },
      title: "Add this tag again",
      onAction: async () => {
        setTags([...tags, tag]);
        await addedTagHud(tag, setTags, tags);
      },
    },
  });
}

export const TagPickerWithAddTag = forwardRef(function TagPickerWithAddTag(
  props: Form.TagPicker.Props & {
    addTagTitle?: string;
    addTagId?: string;
    addTagPlaceholder?: string;
  },
  ref: Ref<Form.TagPicker>
) {
  const { addTagTitle, addTagId, addTagPlaceholder, ...tagProps } = props;
  const { data: dataTags } = useApiFetchPagination<"tags", string>("tags");

  const [tags, setTags] = useState<string[]>(
    Array.from(new Set([...(props.value ? props.value : []), ...(dataTags?.tags.data || [])]))
  );
  const [newTag, setNewTag] = useState<string>("");
  const [newTagError, setNewTagError] = useState<string>("");

  return (
    <>
      <Form.TagPicker {...tagProps} ref={ref}>
        {tags.map((tag) => (
          <Form.TagPicker.Item
            key={tag}
            value={tag}
            title={tag}
            icon={{ source: Icon.Tag, tintColor: hashedHSL(tag) }}
          />
        ))}
      </Form.TagPicker>
      <Form.TextField
        id={addTagId || `new-tag-${props.id}`}
        title={addTagTitle || "Add new tag"}
        info="Unfocus this field (click to tag picker) to add new tag"
        value={newTag}
        placeholder={addTagPlaceholder || "tag-name"}
        onChange={setNewTag}
        error={newTagError}
        onBlur={async () => {
          if (newTag.length) {
            if (!tags.includes(newTag)) {
              setTags([...tags, newTag]);
              setNewTag("");
              await addedTagHud(newTag, setTags, tags);
            } else {
              setNewTagError("Tag already exists");
            }
          }
        }}
      />
    </>
  );
});
