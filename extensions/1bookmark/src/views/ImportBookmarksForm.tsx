import { Form, ActionPanel, Action, showToast, useNavigation, Toast, Icon, Keyboard } from "@raycast/api";
import { CachedQueryClientProvider } from "../components/CachedQueryClientProvider";
import { BrowserBookmark } from "../types";
import { trpc } from "../utils/trpc.util";
import { NewTagForm } from "./NewTagForm";
import { useTags } from "../hooks/use-tags.hook";

interface FormValues {
  tags: string[];
}

interface Props {
  bookmarks: BrowserBookmark[];
  spaceId: string;
  spaceName: string;
  browserName: string;
}

function Body(props: Props) {
  const { bookmarks, spaceId, spaceName, browserName } = props;
  const { pop } = useNavigation();

  const { data: spaceTags, refetch: spaceTagsRefetch, isLoading } = useTags(spaceId);
  const importBookmarks = trpc.bookmark.import.useMutation();

  function handleSubmit(values: FormValues) {
    importBookmarks.mutate(
      {
        spaceId,
        tags: values.tags,
        browserName,
        bookmarks: bookmarks.map((b) => ({
          url: b.url,
          name: b.title,
          description: b.folder ? `Imported from ${browserName}, folder: ${b.folder}` : `Imported from ${browserName}`,
        })),
      },
      {
        onSuccess: () => {
          pop();
          showToast({
            style: Toast.Style.Success,
            title: "Bookmarks imported successfully",
            message: `${bookmarks.length} bookmarks imported to "${spaceName}"`,
          });
        },
      },
    );
  }

  if (isLoading) {
    return <Form isLoading={true} />;
  }

  return (
    <Form
      isLoading={importBookmarks.isPending}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={`Import ${bookmarks.length} Bookmarks`}
            icon={Icon.Download}
            onSubmit={handleSubmit}
          />
          <Action.Push
            title="Create New Tag"
            icon={Icon.Tag}
            shortcut={Keyboard.Shortcut.Common.New}
            target={<NewTagForm spaceId={spaceId} />}
            onPop={() => {
              spaceTagsRefetch();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`Import ${bookmarks.length} bookmarks to ${spaceName}`} />

      <Form.Separator />

      {bookmarks.length > 0 && (
        <Form.Description
          title="Bookmarks to Import"
          text={
            bookmarks.length <= 5
              ? bookmarks.map((b) => `- ${b.title}`).join("\n")
              : bookmarks
                  .slice(0, 5)
                  .map((b) => `- ${b.title}`)
                  .join("\n") + `\n... ${bookmarks.length - 5} more bookmarks`
          }
        />
      )}

      <Form.Separator />

      <Form.Description title="Space" text={spaceName} />

      <Form.TagPicker id="tags" title="Tags" defaultValue={[]}>
        {spaceTags
          ? spaceTags.map((tag) => (
              <Form.TagPicker.Item key={tag.name} value={tag.name} icon={tag.icon || ""} title={tag.name} />
            ))
          : []}
      </Form.TagPicker>
      <Form.Description text={`➕ You can create a new tag by '⌘ + n'`} />
      <Form.Description text="These tags will be applied to all imported bookmarks." />
    </Form>
  );
}

export function ImportBookmarksForm(props: Props) {
  return (
    <CachedQueryClientProvider>
      <Body
        bookmarks={props.bookmarks}
        spaceId={props.spaceId}
        spaceName={props.spaceName}
        browserName={props.browserName}
      />
    </CachedQueryClientProvider>
  );
}
