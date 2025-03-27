import { Action, ActionPanel, Form, getPreferenceValues, popToRoot, showToast, Toast } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import NoAccountsList from "./components/no-accounts-list";
import { createBookmark, getWebsiteMetadata } from "./service/bookmark-service";
import { getPersistedLinkdingAccounts } from "./service/user-account-service";
import { LinkdingAccountMap, PostLinkdingBookmarkPayload } from "./types/linkding-types";
import { validateUrl } from "./util/bookmark-util";

export default function CreateBookmarks() {
  const preferences = getPreferenceValues<Preferences>();
  const [linkdingAccountMap, setLinkdingAccountMap] = useState<LinkdingAccountMap>({});
  const [numberOfAccounts, setNumberOfAccounts] = useState(0);
  const [didGetAccounts, setDidGetAccounts] = useState(false);
  useEffect(() => {
    getPersistedLinkdingAccounts().then((linkdingMap) => {
      if (linkdingMap) {
        setLinkdingAccountMap(linkdingMap);
        setNumberOfAccounts(Object.keys(linkdingMap).length);
      }
      setDidGetAccounts(true);
    });
  }, [setLinkdingAccountMap, setNumberOfAccounts]);

  const { handleSubmit, itemProps, setValue } = useForm<
    PostLinkdingBookmarkPayload & { linkdingAccountName: string; tags: string }
  >({
    async onSubmit(values) {
      const linkdingAccount = linkdingAccountMap[values.linkdingAccountName] ?? Object.values(linkdingAccountMap)[0];
      if (!linkdingAccount) {
        throw new Error("No account");
      }

      const toast = await showToast(Toast.Style.Animated, "Creating bookmark", values.title);
      createBookmark(linkdingAccount, {
        ...values,
        shared: false,
        is_archived: false,
        tag_names: values.tags.split(" ").filter((tag) => tag.length > 0),
      })
        .then(() => {
          toast.title = "Bookmark created successfully";
          popToRoot();
        })
        .catch((error) => {
          toast.style = Toast.Style.Failure;
          toast.title = "Could not create";
          toast.message = `${error}`;
        });
    },
    validation: {
      url(value) {
        if (!value) return "URL is required";
        if (!validateUrl(value)) return "URL must be a valid url";
        getMetadata(value);
      },
    },
    initialValues: {
      unread: preferences.createBookmarksAsUnread,
    },
  });

  const [isLoadingMetadata, setIsLoadingMetadata] = useState<boolean>(false);
  function getMetadata(url: string) {
    setIsLoadingMetadata(true);
    getWebsiteMetadata(url)
      .then((metadata) => {
        if (metadata) {
          setValue("title", metadata.title);
          setValue("description", metadata.description ?? "");
        }
      })
      .finally(() => setIsLoadingMetadata(false));
  }

  if (numberOfAccounts === 0 && didGetAccounts) {
    return <NoAccountsList />;
  }

  return (
    <Form
      isLoading={isLoadingMetadata}
      actions={
        <ActionPanel title="Create Bookmark">
          <Action.SubmitForm onSubmit={handleSubmit} title="Create Bookmark" />
        </ActionPanel>
      }
    >
      {Object.keys(linkdingAccountMap).length > 1 && (
        <Form.Dropdown title="Linkding Account" placeholder="Linkding Account" {...itemProps.linkdingAccountName}>
          {Object.keys(linkdingAccountMap).map((name) => {
            return <Form.Dropdown.Item key={name} title={name} value={name}></Form.Dropdown.Item>;
          })}
        </Form.Dropdown>
      )}
      <Form.TextField title="URL" placeholder="https://raycast.com" {...itemProps.url} />
      <Form.TextField
        title="Tags"
        placeholder="tools productivity"
        info="Enter any number of tags separated by space and without the hash (#). If a tag does not exist it will be automatically created."
        {...itemProps.tags}
      />
      <Form.TextField title="Title" placeholder="Raycast - Your shortcut to everything" {...itemProps.title} />
      <Form.TextArea
        title="Description"
        placeholder="A collection of powerful productivity tools all within an extendable launcher."
        {...itemProps.description}
      />
      <Form.TextArea title="Notes" placeholder="Additional notes" {...itemProps.notes} />
      <Form.Checkbox
        label="Mark as Unread"
        info="Unread bookmarks can be filtered for, and marked as read after you had a chance to look at them."
        {...itemProps.unread}
      />
    </Form>
  );
}
