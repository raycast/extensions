import { Form, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import FormActions from "../actions/FormActions";
import useLinkForm from "../hooks/use-link-form";
import useTags from "../hooks/use-tags";

export default function LinkForm() {
  const { values, onChange, loading: linkLoading } = useLinkForm();
  const { tags, loading: tagsLoading } = useTags();
  const toastRef = useRef<Toast>();
  const [hasShownToast, setHasShownToast] = useState(false);

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

    // Cleanup on unmount
    return () => {
      toastRef.current?.hide();
    };
  }, [linkLoading, hasShownToast]);

  return (
    <Form
      navigationTitle="Save Bookmark"
      isLoading={tagsLoading || linkLoading}
      actions={<FormActions values={values} />}
    >
      <Form.TextField id="url" title="URL" value={values.url} onChange={onChange("url")} />
      <Form.TextField id="title" title="Title" value={values.title} onChange={onChange("title")} />
      <Form.TagPicker id="tags" title="Tags" value={values.tags} onChange={onChange("tags")}>
        {tags.map((tag) => (
          <Form.TagPicker.Item title={tag} value={tag} key={tag} />
        ))}
      </Form.TagPicker>
      <Form.TextArea id="notes" title="Notes" value={values.description} onChange={onChange("description")} />
    </Form>
  );
}
