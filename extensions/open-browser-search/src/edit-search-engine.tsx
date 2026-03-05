import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useMemo } from "react";
import { useBrowsers } from "./browsers";
import { showDeletionModal } from "./delete-modal";
import { getExistingTitlesAndUrls, updateSavedSites } from "./saved-sites";
import { SavedSitesEditingKind, SavedSitesState } from "./types";
import { strEq, SEARCH_TEMPLATE } from "./utils";

interface EditSavedSitesProps extends SavedSitesState {
  operation: SavedSitesEditingKind;
  title?: string;
  url?: string;
  isDefault?: boolean;
  preferredBrowserBundleId?: string;
}

export function EditSavedSites(props: EditSavedSitesProps) {
  const { savedSites, setSavedSites, operation, title, url, isDefault, preferredBrowserBundleId } = props;
  const { pop } = useNavigation();
  const { data: browsers } = useBrowsers();

  const isEditing = operation.type === "edit";

  const { titles: existingTitles, urls: existingUrls } = useMemo(
    () => getExistingTitlesAndUrls(savedSites),
    [savedSites],
  );

  function getTitleErrorMessage(value: string | undefined): string | undefined {
    const v = (value ?? "").trim();
    if (v.length === 0) return "Title is required";
    if (isEditing && strEq(v, title ?? "")) return undefined;
    if (existingTitles.some((t) => strEq(t, v))) return "A site with this title already exists";
    return undefined;
  }

  function getUrlErrorMessage(value: string | undefined): string | undefined {
    const v = (value ?? "").trim();
    if (v.length === 0) return "URL is required";
    if (!v.includes(SEARCH_TEMPLATE))
      return `URL must contain ${SEARCH_TEMPLATE} as a placeholder for the search query`;
    try {
      new URL(v.replace(SEARCH_TEMPLATE, "test"));
    } catch {
      return "URL is not valid";
    }
    if (isEditing && strEq(v, url ?? "")) return undefined;
    if (existingUrls.some((u) => strEq(u, v))) return "A site with this URL already exists";
    return undefined;
  }

  const { handleSubmit, itemProps } = useForm<{
    title: string;
    url: string;
    isDefault: boolean;
    preferredBrowserBundleId: string;
  }>({
    initialValues: {
      title: title ?? "",
      url: url ?? "",
      isDefault: isDefault ?? false,
      preferredBrowserBundleId: preferredBrowserBundleId ?? "__NONE__",
    },
    validation: {
      title: getTitleErrorMessage,
      url: getUrlErrorMessage,
    },
    onSubmit(values) {
      const newBrowserId = values.preferredBrowserBundleId === "__NONE__" ? undefined : values.preferredBrowserBundleId;

      if (isEditing && operation.type === "edit") {
        updateSavedSites(
          { savedSites, setSavedSites },
          {
            type: "edit",
            index: operation.index,
            oldIsDefault: isDefault ?? false,
            newTitle: values.title.trim(),
            newUrl: values.url.trim(),
            newIsDefault: values.isDefault,
            newPreferredBrowserBundleId: newBrowserId,
          },
        );
      } else {
        updateSavedSites(
          { savedSites, setSavedSites },
          {
            type: "add",
            newTitle: values.title.trim(),
            newUrl: values.url.trim(),
            newIsDefault: values.isDefault,
            newPreferredBrowserBundleId: newBrowserId,
          },
        );
      }
      pop();
    },
  });

  return (
    <Form
      navigationTitle={isEditing ? "Edit Search Site" : "Add Search Site"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" icon={Icon.Check} onSubmit={handleSubmit} />
          {isEditing && operation.type === "edit" && (
            <Action
              title={`Delete "${title}"`}
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ key: "x", modifiers: ["ctrl"] }}
              onAction={() =>
                showDeletionModal({
                  savedSites,
                  setSavedSites,
                  title: title ?? "",
                  index: operation.index,
                  pop,
                })
              }
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.title} title="Title" placeholder="Search engine or website title" />
      <Form.TextField
        {...itemProps.url}
        title="URL Template"
        placeholder={`URL with ${SEARCH_TEMPLATE} as placeholder (e.g., https://google.com/search?q={})`}
      />
      <Form.Separator />
      <Form.Dropdown
        {...itemProps.preferredBrowserBundleId}
        title="Preferred Browser"
        info="Open results from this site in a specific browser. Leave as 'Default' to use the global preference."
      >
        <Form.Dropdown.Item value="__NONE__" title="Default (use global preference)" icon={Icon.Globe} />
        {browsers?.map((browser) => (
          <Form.Dropdown.Item
            key={browser.bundleId ?? browser.name}
            value={browser.bundleId ?? browser.name}
            title={browser.name}
            icon={{ fileIcon: browser.path }}
          />
        ))}
      </Form.Dropdown>
      <Form.Checkbox {...itemProps.isDefault} label="Set as default search site" />
    </Form>
  );
}
