import colorString from "color-string";
import React from "react";
import { User } from "@supabase/supabase-js";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  PopToRootType,
  Toast,
  getPreferenceValues,
  showHUD,
  showToast,
  showFailureToast,
} from "@raycast/api";
import * as db from "../lib/db";
import { ensureValidUrl } from "../lib/ensure-valid-url";
import { useActiveTab, getActiveTabFromBrowser } from "../lib/use-active-tab";
import { useGroups } from "../lib/use-groups";
import { isUrlLike } from "../lib/is-url-like";
import { fetchMicrolinkData } from "../lib/use-microlink";
import AuthenticatedView from "./components/authenticated-view";
import { BMRKS_SERVICE_NAME, HOST_URL, SUPPORTED_BROWSERS } from "./constants";

// Define BookmarkValues interface outside the component so it can be used in useForm
interface BookmarkValues {
  groupId: string;
  value: string;
  title?: string;
}

function CreateBookmark({ user }: { user: User }) {
  const { handleSubmit, itemProps, setValue, values } = useForm<BookmarkValues>({
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
          const data = await fetchMicrolinkData(validUrl);
          if (data) {
            // Use title from API if not provided by user
            if (!title && data.data?.title) {
              title = data.data.title;
            }
            // Get logo URL if available
            if (data.data?.logo?.url) {
              faviconUrl = data.data.logo.url;
            }
          } else {
            await showFailureToast("Failed to fetch metadata", new Error(`Microlink API returned no data`));
          }
        } catch (error) {
          await showFailureToast("Error fetching metadata", error instanceof Error ? error : new Error(String(error)));
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

  // Store the previous URL to detect changes
  const previousUrlRef = React.useRef("");
  const [initialized, setInitialized] = React.useState(false);

  // Only set value/title from activeTab on initial mount
  React.useEffect(() => {
    if (activeTab && !initialized) {
      setValue("value", activeTab.url);
      setValue("title", activeTab.title);
      previousUrlRef.current = activeTab.url;
      setInitialized(true);
    }
  }, [activeTab, initialized, setValue]);

  // If ESC is pressed and form is cleared, reset initialized
  React.useEffect(() => {
    if (values.value === "" && initialized) {
      setValue("title", undefined);
      previousUrlRef.current = "";
      setInitialized(false);
    }
  }, [values.value, initialized, setValue]);

  const [titleManuallyEdited, setTitleManuallyEdited] = React.useState(false);
  const valueIsUrl = isUrlLike(values.value);
  const activeGroup = groups && groups.find((group) => group.id === values.groupId);

  // Track if title field is focused
  const [titleFocused, setTitleFocused] = React.useState(false);

  // Reset titleManuallyEdited to false on every URL change, unless title is focused or was edited after last URL change
  React.useEffect(() => {
    if (!valueIsUrl) {
      setTitleManuallyEdited(false);
      return;
    }
    // Only reset if not focused and not manually edited after last change
    if (!titleFocused) {
      setTitleManuallyEdited(false);
    }
    // If focused or manually edited, do not reset
  }, [values.value]);

  // Debounced effect: fetch title from Microlink when URL changes, unless user edited title
  React.useEffect(() => {
    if (!valueIsUrl || titleManuallyEdited) return;
    let cancelled = false;
    async function fetchTitle() {
      const preferences = getPreferenceValues<{ enhanceTitle: boolean }>();
      if (!preferences.enhanceTitle) return;
      try {
        const validUrl = ensureValidUrl(values.value);
        const data = await fetchMicrolinkData(validUrl);
        if (!cancelled && data?.data?.title) {
          setValue("title", data.data.title);
        } else if (!cancelled) {
          await showToast({
            style: Toast.Style.Animated,
            title: "Could not fetch title",
            message: "Microlink API did not return a title.",
          });
        }
      } catch {
        if (!cancelled) {
          await showToast({
            style: Toast.Style.Animated,
            title: "Could not fetch title",
            message: "Microlink API request failed.",
          });
        }
      }
    }
    const timer = setTimeout(fetchTitle, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [values.value, valueIsUrl, titleManuallyEdited, setValue]);

  // Detect manual edits to the title field
  const titleFieldProps = {
    ...itemProps.title,
    onFocus: () => setTitleFocused(true),
    onBlur: () => setTitleFocused(false),
    onChange: (newTitle: string) => {
      setTitleManuallyEdited(true);
      itemProps.title.onChange?.(newTitle);
    },
  };

  // Handler to fetch active tab from a specific browser and update form
  async function fetchTabFromBrowser(browser: string) {
    try {
      await showToast({ style: Toast.Style.Animated, title: `Getting link from ${browser}` });
      const tab = await getActiveTabFromBrowser(browser);
      if (!tab) throw new Error("No active tab found");
      setValue("value", tab.url);
      setValue("title", tab.title);
      await showToast({ style: Toast.Style.Success, title: `Link from ${browser} loaded` });
    } catch {
      await showToast({ style: Toast.Style.Failure, title: `Could not get link from ${browser}` });
    }
  }

  // Reset titleManuallyEdited if URL is cleared or form is reset
  React.useEffect(() => {
    if (!valueIsUrl && titleManuallyEdited) {
      setTitleManuallyEdited(false);
    }
  }, [valueIsUrl, titleManuallyEdited]);

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
                url={`${HOST_URL}/${user.user_metadata["username"]}/${activeGroup.name.toLowerCase()}`}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Get Link from Browser">
            {SUPPORTED_BROWSERS.map((browser: string) => (
              <Action
                key={browser}
                title={`Get Link from ${browser.replace("Browser", "")}`.trim()}
                onAction={() => fetchTabFromBrowser(browser)}
              />
            ))}
          </ActionPanel.Section>
        </ActionPanel>
      }
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
        onBlur={async () => {
          // Only fetch if valid URL, title not manually edited, and title field not focused
          if (isUrlLike(values.value) && !titleManuallyEdited && !titleFocused) {
            const preferences = getPreferenceValues<{ enhanceTitle: boolean }>();
            if (!preferences.enhanceTitle) return;
            try {
              const validUrl = ensureValidUrl(values.value);
              const data = await fetchMicrolinkData(validUrl);
              if (data?.data?.title) {
                setValue("title", data.data.title);
              } else {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not fetch title",
                  message: "Microlink API did not return a title.",
                });
              }
            } catch {
              await showToast({
                style: Toast.Style.Failure,
                title: "Could not fetch title",
                message: "Microlink API request failed.",
              });
            }
          }
        }}
      />
      {valueIsUrl && (
        <Form.TextField
          title="Link Title"
          placeholder="Custom title for your bookmark (optional)"
          {...titleFieldProps}
        />
      )}
    </Form>
  );
}

export default function Command() {
  return <AuthenticatedView component={(componentProps) => <CreateBookmark {...componentProps} />} />;
}
