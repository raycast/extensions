import { Form, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FormActions from "../actions/FormActions";
import getFaviconIcon, { describeFaviconSource } from "../helpers/get-favicon-icon";
import { findDuplicateBookmark } from "../helpers/url-sanitizer";
import useFiles from "../hooks/use-files";
import useLinkForm from "../hooks/use-link-form";
import useTags from "../hooks/use-tags";
import * as methods from "../actions/methods";
import { Preferences } from "../types";

export default function LinkForm() {
  const { values, onChange, setValues, loading: linkLoading } = useLinkForm();
  const { tags, loading: tagsLoading } = useTags();
  const { files, loading: filesLoading } = useFiles();
  const toastRef = useRef<Toast>();
  const [hasShownToast, setHasShownToast] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [faviconQuery, setFaviconQuery] = useState("");

  // The favicon dropdown doubles as a text field: whatever is typed in its
  // search bar becomes a selectable option, so the chosen icon can be shown
  // inside the field itself. The first option always clears the override.
  const faviconOptions = useMemo(() => {
    const values_ = [""];
    const committed = values.favicon.trim();
    const typed = faviconQuery.trim();
    if (committed) values_.push(committed);
    if (typed && typed !== committed) values_.push(typed);

    return values_.map((value) => {
      const attributes = { source: values.url, favicon: value || null };
      return { value, title: describeFaviconSource(attributes), icon: getFaviconIcon(attributes) };
    });
  }, [values.url, values.favicon, faviconQuery]);

  // Handle URL validation and duplicate checking
  const validateUrl = useCallback(
    async (url: string) => {
      const { checkDuplicates } = getPreferenceValues<Preferences>();

      if (!url || filesLoading || !checkDuplicates) {
        setIsDuplicate(false);
        return;
      }

      const duplicate = findDuplicateBookmark(url, files);
      if (duplicate) {
        setIsDuplicate(true);
        showToast({
          style: Toast.Style.Failure,
          title: "Duplicate bookmark found",
          message: `This URL is already bookmarked as "${duplicate.attributes.title}"`,
          primaryAction: {
            title: "View Existing",
            onAction: () => methods.openObsidianFile(duplicate),
          },
        });
      } else {
        setIsDuplicate(false);
      }
    },
    [files, filesLoading]
  );

  // Check for duplicates whenever URL changes
  useEffect(() => {
    validateUrl(values.url);
  }, [values.url, validateUrl]);

  // Handle loading toast
  useEffect(() => {
    if (linkLoading && !hasShownToast) {
      showToast({
        title: "Fetching link details",
        style: Toast.Style.Animated,
      }).then((toast) => {
        toastRef.current = toast;
        setHasShownToast(true);
      });
    } else if (!linkLoading && toastRef.current) {
      toastRef.current.hide();
      toastRef.current = undefined;
    }

    return () => {
      toastRef.current?.hide();
    };
  }, [linkLoading, hasShownToast]);

  return (
    <Form
      navigationTitle="Save Bookmark"
      isLoading={tagsLoading || linkLoading || filesLoading}
      actions={<FormActions values={values} setValues={setValues} />}
    >
      <Form.TextField
        id="url"
        title="URL"
        value={values.url}
        onChange={onChange("url")}
        error={isDuplicate ? "This URL is already bookmarked" : undefined}
      />
      <Form.TextField id="title" title="Title" value={values.title} onChange={onChange("title")} />
      <Form.Dropdown
        id="favicon"
        title="Favicon"
        placeholder="Type a website or image URL…"
        info="Optional. A website URL to borrow the favicon from, or a direct link to an image. Leave on the first option to use the URL above."
        filtering={false}
        value={values.favicon}
        // Typing commits the value, so it isn't lost when the dropdown closes
        // without an explicit selection. Blank searches are ignored, because
        // Raycast resets the search text on close — clearing the override is
        // done by picking the first option instead.
        onSearchTextChange={(text) => {
          setFaviconQuery(text);
          if (text.trim()) onChange("favicon")(text.trim());
        }}
        onChange={onChange("favicon")}
      >
        {faviconOptions.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} icon={option.icon} />
        ))}
      </Form.Dropdown>
      <Form.TagPicker id="tags" title="Tags" value={values.tags} onChange={onChange("tags")}>
        {tags.map((tag) => (
          <Form.TagPicker.Item title={tag} value={tag} key={tag} />
        ))}
      </Form.TagPicker>
      <Form.TextArea id="notes" title="Notes" value={values.description} onChange={onChange("description")} />
    </Form>
  );
}
