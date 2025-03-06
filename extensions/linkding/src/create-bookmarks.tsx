import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { LinkdingAccountMap, PostLinkdingBookmarkPayload } from "./types/linkding-types";
import { useEffect, useState } from "react";
import { getPersistedLinkdingAccounts } from "./service/user-account-service";
import { validateUrl } from "./util/bookmark-util";
import { createBookmark, getWebsiteMetadata } from "./service/bookmark-service";
import { useForm } from "@raycast/utils";

export default function CreateBookmarks() {
  const [linkdingAccountMap, setLinkdingAccountMap] = useState<LinkdingAccountMap>({});
  const [loading, setLoading] = useState<boolean>(false);
  useEffect(() => {
    getPersistedLinkdingAccounts().then((linkdingMap) => {
      if (linkdingMap) {
        setLinkdingAccountMap(linkdingMap);
      }
    });
  }, [setLinkdingAccountMap]);

  const { handleSubmit, itemProps, setValue } = useForm<PostLinkdingBookmarkPayload & { linkdingAccountName: string }>({
    async onSubmit(values) {
      const linkdingAccount = linkdingAccountMap[values.linkdingAccountName];

      const toast = await showToast(Toast.Style.Animated, "Creating bookmark", values.title);
      createBookmark(linkdingAccount, {
        ...values,
        shared: false,
        is_archived: false,
        tag_names: [],
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
  });

  function getMetadata(url: string) {
    setLoading(true);
    getWebsiteMetadata(url)
      .then((metadata) => {
        if (metadata) {
          setValue("title", metadata.title);
          setValue("description", metadata.description ?? "");
        }
      })
      .finally(() => setLoading(false));
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel title="Create Bookmark">
          <Action.SubmitForm onSubmit={handleSubmit} title="Create Bookmark" />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Linkding Account" placeholder="Linkding Account" {...itemProps.linkdingAccountName}>
        {Object.keys(linkdingAccountMap).map((name) => {
          return <Form.Dropdown.Item key={name} title={name} value={name}></Form.Dropdown.Item>;
        })}
      </Form.Dropdown>
      <Form.TextField title="URL" placeholder="https://raycast.com" {...itemProps.url} />
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
