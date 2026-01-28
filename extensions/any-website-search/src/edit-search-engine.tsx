import { Action, ActionPanel, Form, useNavigation, showToast, Toast, Icon } from "@raycast/api";
import { useMemo } from "react";
import { URL } from "node:url";
import { useForm } from "@raycast/utils";
import {
  SEARCH_TEMPLATE,
  getExistingTitlesAndUrls,
  SavedSitesEditingKind,
  FormData,
  SavedSitesState,
  updateSavedSites,
} from "./saved-sites";
import SearchSuggestions from "./search-any-site";
import { strEq } from "./utils";
import { showDeletionModal } from "./delete-modal";

function getTitleErrorMessage(
  title: string,
  { existingTitles, initialTitle }: { existingTitles: string[]; initialTitle: string },
) {
  if (title.length === 0) {
    return "Title may not be empty";
  }

  title = title.trim();
  if (title.length === 0) {
    return "Title may not consist solely of whitespace characters";
  }

  if (!strEq(title, initialTitle) && existingTitles.some((existing) => strEq(title, existing))) {
    return "A site with this title has already been saved";
  }

  return undefined;
}

// https://stackoverflow.com/a/43467144
function getUrlErrorMessage(url: string, { existingUrls, initialUrl }: { existingUrls: string[]; initialUrl: string }) {
  if (url.length === 0) {
    return "URL template may not be empty";
  }

  if (!url.includes(SEARCH_TEMPLATE)) {
    return `URL template is missing the template string "${SEARCH_TEMPLATE}"`;
  }

  try {
    new URL(url);
  } catch {
    return 'Invalid URL (did you forget the "https://"?)';
  }

  if (!strEq(url, initialUrl) && existingUrls.some((existing) => strEq(url, existing))) {
    return "A site with this template URL has already been saved";
  }

  return undefined;
}

export function EditSavedSites(
  props: SavedSitesState &
    Partial<FormData> & {
      operation: SavedSitesEditingKind;
    },
) {
  const {
    savedSites,
    setSavedSites,
    title: initialTitle,
    url: initialUrl,
    isDefault: initialIsDefault,
    operation,
  } = props;

  const { push, pop } = useNavigation();

  const isEditingExistingSite = operation.type === "edit";
  const isInitialView = savedSites.items.length === 0;

  const existingTitlesAndUrls = useMemo(() => {
    return getExistingTitlesAndUrls(savedSites);
  }, [savedSites]);
  // const [existingTitles, setExistingTitles] = useState(getExistingTitles(savedSites));

  const { handleSubmit, itemProps } = useForm<FormData>({
    onSubmit({ title, url, isDefault }) {
      const newSavedSiteData = { newTitle: title, newUrl: url, newIsDefault: isDefault };
      if (isEditingExistingSite) {
        updateSavedSites(
          { savedSites, setSavedSites },
          { type: "edit", index: operation.index, ...newSavedSiteData, oldIsDefault: initialIsDefault ?? false },
        );
        // savedSitesDispatch({ type: "edit", index: operation.index, ...newSavedSiteData });
      } else {
        updateSavedSites({ savedSites, setSavedSites }, { type: "add", ...newSavedSiteData });
      }

      const successMessage = isEditingExistingSite ? `Edited site "${title}"` : `Added site "${title}"`;
      showToast({
        style: Toast.Style.Success,
        title: successMessage,
      });

      pop();
      if (isInitialView) {
        push(<SearchSuggestions />);
      }
    },
    initialValues: {
      title: initialTitle,
      url: initialUrl,
      isDefault: initialIsDefault,
    },
    validation: {
      title: (title) =>
        getTitleErrorMessage(title ?? "", {
          existingTitles: existingTitlesAndUrls.titles,
          initialTitle: initialTitle ?? "",
        }),
      url: (url) =>
        getUrlErrorMessage(url ?? "", {
          existingUrls: existingTitlesAndUrls.urls,
          initialUrl: initialUrl ?? "",
        }),
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" icon={Icon.Checkmark} onSubmit={handleSubmit} />
          {isEditingExistingSite && (
            <Action
              title="Delete"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ key: "x", modifiers: ["ctrl"] }}
              onAction={() =>
                showDeletionModal({
                  savedSites,
                  setSavedSites,
                  title: itemProps.title.value ?? "",
                  index: operation.index,
                  pop,
                })
              }
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Description
        title={isEditingExistingSite ? "Edit search" : "Add new search"}
        text="Specify the title and the URL template of the website you want to be able to search."
      />
      <Form.Separator></Form.Separator>
      <Form.TextField
        key="title"
        title="Title"
        placeholder="Search engine or website title"
        {...itemProps.title}
      ></Form.TextField>
      <Form.TextField
        key="url"
        title="URL"
        placeholder="URL Template"
        info={[
          "The URL template to use for searching this site. " +
            `Since this is a URL template, write "${SEARCH_TEMPLATE}" where your search text should go; the "${SEARCH_TEMPLATE}" will be replaced with your (URL-encoded) search text. ` +
            "Examples:",
          `- https://www.google.com/search?q=${SEARCH_TEMPLATE}`,
          `- https://duckduckgo.com/?q=${SEARCH_TEMPLATE}`,
          `- https://en.wikipedia.org/wiki/${SEARCH_TEMPLATE}`,
        ].join("\n")}
        {...itemProps.url}
      ></Form.TextField>
      <Form.Checkbox
        key="default"
        title="Default?"
        label="Make this the default site for searches"
        info="This will override any previously assigned default"
        {...itemProps.isDefault}
      ></Form.Checkbox>
    </Form>
  );
}
