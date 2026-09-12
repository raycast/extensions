import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  openExtensionPreferences,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { getVaultPath, isValidVault } from "./vault";
import { addBookmark, setBookmarkArchived } from "./bookmarks";

interface FormValues {
  url: string;
  title: string;
}

export default function Command() {
  const vaultPath = getVaultPath();
  const valid = isValidVault(vaultPath);

  const { handleSubmit, itemProps } = useForm<FormValues>({
    validation: {
      url: (value) => {
        if (!value?.trim()) return "URL is required";
        const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
        try {
          new URL(withScheme);
        } catch {
          return "That doesn't look like a valid URL";
        }
      },
    },
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Saving…" });
      let result;
      try {
        result = await addBookmark(vaultPath, values.url, values.title);
      } catch (error) {
        await showFailureToast(error, { title: "Couldn't save the bookmark" });
        return;
      }
      if (result.status === "invalid-url") {
        toast.style = Toast.Style.Failure;
        toast.title = "That doesn't look like a valid URL";
        return;
      }
      if (result.status === "duplicate") {
        const archived = result.existing.archivedAt !== null;
        toast.style = Toast.Style.Failure;
        toast.title = archived ? "Already saved (archived)" : "Already saved";
        toast.message = result.existing.title;
        if (archived) {
          toast.primaryAction = {
            title: "Restore",
            onAction: async () => {
              await setBookmarkArchived(vaultPath, result.existing.id, false);
              await showToast({ style: Toast.Style.Success, title: "Restored", message: result.existing.title });
              await popToRoot();
            },
          };
        }
        return;
      }
      toast.style = Toast.Style.Success;
      toast.title = "Saved";
      toast.message = result.bookmark.title;
      await popToRoot();
    },
  });

  if (!valid) {
    return (
      <List>
        <List.EmptyView
          title="This doesn't look like a MarkdownOS vault"
          description={`No .markdownos folder found in ${vaultPath}.`}
          actions={
            <ActionPanel>
              <Action title="Change Vault Folder" icon={Icon.Cog} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Bookmark" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="URL" placeholder="https://example.com" {...itemProps.url} />
      <Form.TextField
        title="Title"
        placeholder="Optional — the page's own title is used if left blank"
        {...itemProps.title}
      />
    </Form>
  );
}
