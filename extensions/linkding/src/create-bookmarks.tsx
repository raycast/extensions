import { Action, ActionPanel, Form, popToRoot } from "@raycast/api";
import { LinkdingAccountMap, PostLinkdingBookmarkPayload } from "./types/linkding-types";
import React, { useEffect, useState } from "react";
import { getPersistedLinkdingAccounts } from "./service/user-account-service";
import { showSuccessToast, validateUrl } from "./util/bookmark-util";
import { createBookmark, getWebsiteMetadata } from "./service/bookmark-service";

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

  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [url, setUrl] = useState<string>("");
  const [urlError, setUrlError] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [read, setRead] = useState<boolean>(false);

  function getMetadata(url: string) {
    setLoading(true);
    getWebsiteMetadata(url)
      .then((metadata) => {
        if (metadata) {
          setTitle(metadata.title);
          setDescription(metadata.description ?? "");
        }
      })
      .finally(() => setLoading(false));
  }

  function validateBookmarkUrl(url?: string): void {
    if (url) {
      if (!validateUrl(url)) {
        setUrlError("URL must start with http:// or https://");
      } else {
        getMetadata(url);
        setUrl(url);
      }
    } else {
      setUrlError("URL is required");
    }
  }

  function dropUrlErrors(): void {
    setUrlError(undefined);
  }

  function submitForm(formValues: PostLinkdingBookmarkPayload & { linkdingAccountName: string }) {
    const linkdingAccount = linkdingAccountMap[formValues.linkdingAccountName];
    createBookmark(linkdingAccount, {
      ...formValues,
      shared: false,
      is_archived: false,
      tag_names: [],
    }).then((data) => {
      showSuccessToast("Bookmark created successfully");
      popToRoot();
    });
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel title="Create Bookmark">
          <Action.SubmitForm
            onSubmit={(
              formValues: PostLinkdingBookmarkPayload & {
                linkdingAccountName: string;
              }
            ) => submitForm(formValues)}
            title="Create Bookmark"
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="linkdingAccountName" onChange={setSelectedAccount} title="Linkding Account">
        {Object.keys(linkdingAccountMap).map((name) => {
          return <Form.Dropdown.Item key={name} title={name} value={name}></Form.Dropdown.Item>;
        })}
      </Form.Dropdown>
      <Form.TextField
        onBlur={(event) => validateBookmarkUrl(event.target.value)}
        onChange={dropUrlErrors}
        error={urlError}
        id="url"
        title="URL"
      />
      <Form.TextField value={title} onChange={setTitle} id="title" title="Title" />
      <Form.TextArea value={description} onChange={setDescription} id="description" title="Description" />
      <Form.TextArea value={notes} onChange={setNotes} id="notes" title="Notes" />
      <Form.Checkbox value={read} onChange={setRead} id="unread" label="Mark as Unread" />
    </Form>
  );
}
