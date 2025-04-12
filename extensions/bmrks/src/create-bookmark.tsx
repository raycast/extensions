import React from "react";
import colorString from "color-string";
import { User } from "@supabase/supabase-js";
import { FormValidation, useForm } from "@raycast/utils";
import { Action, ActionPanel, Form, Icon, PopToRootType, Toast, showHUD, showToast } from "@raycast/api";
import { useGroups } from "../lib/use-groups";
import * as db from "../lib/db";
import { ensureValidUrl } from "../lib/ensure-valid-url";
import { useActiveTab } from "../lib/use-active-tab";
import { isUrlLike } from "../lib/is-url-like";
import AuthenticatedView from "./components/authenticated-view";
import { BMRKS_SERVICE_NAME, HOST_URL } from "./constants";

interface MicrolinkResponse {
  data: {
    title?: string;
    logo?: {
      url: string;
      type: string;
      size: number;
      height: number;
      width: number;
    };
  };
}

function CreateBookmark({ user }: { user: User }) {
  interface BookmarkValues {
    groupId: string;
    value: string;
    title?: string;
  }

  const { handleSubmit, itemProps, setValue, values, reset } = useForm<BookmarkValues>({
    async onSubmit(values) {
      const isValidColor = Boolean(colorString.get(values.value));

      if (isValidColor) {
        const res = await db.insertBookmark({
          type: "color",
          group_id: values.groupId,
          title: values.value,
        });

        if (res.error) {
          await showToast({ style: Toast.Style.Failure, title: "Something went wrong", message: res.error.message });
          return;
        }
      } else if (isUrlLike(values.value)) {
        const validUrl = ensureValidUrl(values.value);

        let { title } = values;
        let faviconUrl = "";

        // Try to get both title and logo from Microlink API
        try {
          const response = await fetch(
            `https://api.microlink.io?url=${encodeURIComponent(validUrl)}&data.title&data.logo`,
          );
          if (response.ok) {
            const data = (await response.json()) as MicrolinkResponse;

            // Use title from API if not provided by user
            if (!title && data.data?.title) {
              title = data.data.title;
            }

            // Get logo URL if available
            if (data.data?.logo?.url) {
              faviconUrl = data.data.logo.url;
            }
          }
        } catch (error) {
          console.error("Error fetching metadata:", error);
        }

        // Fallback for title if Microlink fails
        if (!title) {
          try {
            const url = new URL(validUrl);
            title = url.hostname.replace(/^www\./, "");
          } catch {
            title = validUrl;
          }
        }

        // Fallback for favicon if Microlink fails
        if (!faviconUrl) {
          try {
            faviconUrl = new URL(validUrl).origin + "/favicon.ico";
          } catch {
            // If all else fails, leave favicon empty
          }
        }

        const res = await db.insertBookmark({
          type: "link",
          group_id: values.groupId,
          url: validUrl,
          title,
          favicon_url: faviconUrl,
        });

        if (res.error) {
          await showToast({ style: Toast.Style.Failure, title: "Something went wrong", message: res.error.message });
          return;
        }
      } else {
        const res = await db.insertBookmark({
          type: "text",
          group_id: values.groupId,
          title: values.value,
        });

        if (res.error) {
          await showToast({ style: Toast.Style.Failure, title: "Something went wrong", message: res.error.message });
          return;
        }
      }

      // Show success toast with more details about the bookmark
      const bookmarkType = isValidColor ? "color" : isUrlLike(values.value) ? "link" : "text";
      let displayTitle = values.value;

      // For links, use the title if available, otherwise use URL or domain name
      if (bookmarkType === "link" && values.title) {
        displayTitle = values.title;
      } else if (bookmarkType === "link") {
        // Try to extract domain name for cleaner display
        try {
          const url = new URL(values.value);
          displayTitle = url.hostname.replace(/^www\./, "");
        } catch {
          // Keep using the full URL if parsing fails
        }
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Bookmark Saved",
        message: `${displayTitle} added to ${activeGroup!.name}`,
      });

      await showHUD(`Created in ${activeGroup!.name}`, {
        popToRootType: PopToRootType.Immediate,
      });
    },
    validation: {
      value: FormValidation.Required,
      groupId: FormValidation.Required,
    },
  });

  const activeTab = useActiveTab();
  const { data: groups, isLoading: isLoadingGroups } = useGroups(user);

  React.useEffect(() => {
    if (activeTab) {
      setValue("value", activeTab.url);
      setValue("title", activeTab.title);
    }
  }, [activeTab]);

  React.useEffect(() => {
    if (values.value === "") {
      setValue("title", undefined);
      return;
    }

    // Auto-fetch title and favicon when a URL is entered
    const fetchMetadataForUrl = async () => {
      if (isUrlLike(values.value) && !values.title) {
        try {
          const validUrl = ensureValidUrl(values.value);
          const response = await fetch(
            `https://api.microlink.io?url=${encodeURIComponent(validUrl)}&data.title&data.logo`,
          );

          if (response.ok) {
            const data = (await response.json()) as MicrolinkResponse;
            if (data.data?.title) {
              setValue("title", data.data.title);
            }
          }
        } catch (error) {
          console.error("Error auto-fetching metadata:", error);
          // Silently fail - we don't want to interrupt the user experience
        }
      }
    };

    // Add a small delay to avoid excessive API calls while typing
    const debounceTimer = setTimeout(fetchMetadataForUrl, 500);
    return () => clearTimeout(debounceTimer);
  }, [values.value]);

  const valueIsUrl = isUrlLike(values.value);
  const activeGroup = groups && groups.find((group) => group.id === values.groupId);

  return (
    <Form
      isLoading={isLoadingGroups}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm title="Create Bookmark" icon={Icon.CheckCircle} onSubmit={handleSubmit} />
            {activeGroup && user && (
              <Action.OpenInBrowser
                title={`Open ${activeGroup.name} in ${BMRKS_SERVICE_NAME}`}
                url={`${HOST_URL}${user.user_metadata["username"]}/${activeGroup.name.toLowerCase()}`}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Discard Draft"
              icon={Icon.Trash}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={() => {
                reset({ groupId: "", value: "", title: "" });
                showToast({ style: Toast.Style.Success, title: "Draft Discarded" });
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      enableDrafts
    >
      <Form.Dropdown title="Group" placeholder="Select a group for your bookmark" {...itemProps.groupId}>
        {groups && groups.map((group) => <Form.Dropdown.Item key={group.id} value={group.id} title={group.name} />)}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField
        title="Bookmark"
        placeholder="Enter a URL, color code, or text"
        info={valueIsUrl ? "URL detected - title field available below" : undefined}
        {...itemProps.value}
      />
      {valueIsUrl && (
        <Form.TextField
          title="Link Title"
          placeholder="Custom title for your bookmark (optional)"
          {...itemProps.title}
        />
      )}
    </Form>
  );
}

export default function Command() {
  return <AuthenticatedView component={CreateBookmark} />;
}
