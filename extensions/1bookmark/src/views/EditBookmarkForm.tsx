import { CachedQueryClientProvider } from "@/components/CachedQueryClientProvider";
import { Bookmark } from "@/types";
import { trpc } from "@/utils/trpc.util";
import { Form, ActionPanel, Action, showToast, useNavigation, Toast } from "@raycast/api";
import { useRef, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { NewTagForm } from "./NewTagForm";

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
  const [titleError, setTitleError] = useState<string | undefined>(undefined);

  const urlTextFieldRef = useRef<Form.TextField>(null);
  const [urlError, setUrlError] = useState<string | undefined>(undefined);

  const descriptionTextFieldRef = useRef<Form.TextArea>(null);

  const bookmarkUpdate = trpc.bookmark.update.useMutation();
  const bookmarkExists = trpc.bookmark.exists.useMutation();

  const { data: spaceTags, refetch: spaceTagsRefetch } = trpc.tag.list.useQuery({ spaceIds: [bookmark.spaceId] });

  const { pop } = useNavigation();

  const debouncedUrlCheck = useDebounce(async (value: string) => {
    if (bookmark.url === value) {
      setUrlError(undefined);
      return true;
    }

    const exists = await bookmarkExists.mutateAsync({ url: value, spaceId: bookmark.spaceId });
    if (exists) {
      setUrlError("Bookmark with this URL already exists");
      return false;
    }

    setUrlError(undefined);
    return true;
  }, 500);

  const validateUrlField = async (value: string | undefined) => {
    if (!value || value.length === 0) {
      setUrlError("URL is required");
      return false;
    }

    return await debouncedUrlCheck(value);
  };

  const validateTitleField = (value: string | undefined) => {
    if (!value || value.length === 0) {
      setTitleError("Title is required");
      return false;
    } else {
      setTitleError(undefined);
      return true;
    }
  };

  async function handleSubmit(values: FormValues) {
    const titleValid = validateTitleField(values.titleField);
    const urlValid = await validateUrlField(values.urlField);

    if (!titleValid || !urlValid) {
      showToast({
        style: Toast.Style.Failure,
        title: "Edit Form is invalid",
      });
      return;
    }

    await bookmarkUpdate.mutateAsync({
      id: bookmark.id,
      name: values.titleField,
      url: values.urlField,
      description: values.descriptionField,
      tags: values.tags,
    });

    showToast({
      style: Toast.Style.Success,
      title: "Bookmark updated",
    });

    refetch();
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
          <Action.Push
            title="Create New Tag"
            icon="🏷️"
            shortcut={{ modifiers: ["cmd"], key: "n" }}
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
        info="Title of the bookmark"
        ref={nameTextFieldRef}
        error={titleError}
        onChange={validateTitleField}
        onBlur={(event) => validateTitleField(event.target.value)}
        defaultValue={bookmark.name}
      />
      <Form.TextField
        id="urlField"
        title="URL"
        info="URL of the bookmark"
        ref={urlTextFieldRef}
        error={urlError}
        onChange={validateUrlField}
        onBlur={(event) => validateUrlField(event.target.value)}
        defaultValue={bookmark.url}
      />
      <Form.TextArea
        id="descriptionField"
        title="Description"
        info="Description of the bookmark"
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
