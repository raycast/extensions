import { useRef, useState } from "react";
import { Form, ActionPanel, Action, showToast, useNavigation, Toast, Icon, Keyboard } from "@raycast/api";
import { CachedQueryClientProvider } from "@/components/CachedQueryClientProvider";
import { Bookmark } from "@/types";
import { trpc } from "@/utils/trpc.util";
import { NewTagForm } from "./NewTagForm";
import { useTags } from "../hooks/use-tags.hook";

interface FormValues {
  titleField: string;
  urlField: string;
  descriptionField: string;
  tags: string[];
}

interface Props {
  bookmark: Bookmark;
  refetch: () => void;
}

function Body(props: Props) {
  const { bookmark, refetch } = props;
  const nameTextFieldRef = useRef<Form.TextField>(null);
  const urlTextFieldRef = useRef<Form.TextField>(null);
  const descriptionTextFieldRef = useRef<Form.TextArea>(null);

  const [titleError, setTitleError] = useState<string | undefined>(undefined);
  const [urlError, setUrlError] = useState<string | undefined>(undefined);

  const bookmarkUpdate = trpc.bookmark.update.useMutation();

  const { data: spaceTags, refetch: spaceTagsRefetch } = useTags(bookmark.spaceId);

  const { pop } = useNavigation();

  function handleSubmit(values: FormValues) {
    if (!values.titleField) {
      setTitleError("Title is required");
      return;
    }

    if (!values.urlField) {
      setUrlError("URL is required");
      return;
    }

    bookmarkUpdate.mutate(
      {
        id: bookmark.id,
        name: values.titleField,
        url: values.urlField,
        description: values.descriptionField,
        tags: values.tags,
      },
      {
        onSuccess: () => {
          showToast({
            style: Toast.Style.Success,
            title: "Bookmark updated",
          });
          refetch();
          pop();
        },
      },
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Edit" icon={Icon.Pencil} onSubmit={handleSubmit} />
          <Action.Push
            title="Create New Tag"
            icon={Icon.Tag}
            shortcut={Keyboard.Shortcut.Common.New}
            target={<NewTagForm spaceId={bookmark.spaceId} />}
            onPop={() => {
              spaceTagsRefetch();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Edit bookmark" />
      <Form.TextField
        id="titleField"
        title="Title"
        ref={nameTextFieldRef}
        error={titleError}
        defaultValue={bookmark.name}
      />
      <Form.TextField id="urlField" title="URL" ref={urlTextFieldRef} error={urlError} defaultValue={bookmark.url} />
      <Form.TextArea
        id="descriptionField"
        title="Description"
        ref={descriptionTextFieldRef}
        defaultValue={bookmark.description ?? ""}
      />

      <Form.TagPicker id="tags" title="Tags" defaultValue={bookmark.tags}>
        {spaceTags
          ? spaceTags.map((tag) => (
              <Form.TagPicker.Item key={tag.name} value={tag.name} icon={tag.icon || ""} title={tag.name} />
            ))
          : bookmark.tags.map((tag) => <Form.TagPicker.Item key={tag} value={tag} title={tag} />)}
      </Form.TagPicker>
      <Form.Description text={`➕ You can create a new tag by '⌘ + n'`} />
    </Form>
  );
}

export const EditBookmark = (props: Props) => {
  const { bookmark, refetch } = props;
  return (
    <CachedQueryClientProvider>
      <Body bookmark={bookmark} refetch={refetch} />
    </CachedQueryClientProvider>
  );
};
