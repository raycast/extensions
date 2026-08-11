import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  popToRoot,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";

import { GatherApiError, listCategories, saveReferenceUrl } from "./lib/api";

interface FormValues {
  url: string;
  categoryId: string;
}

export default function Command() {
  const [url, setUrl] = useState("");
  const { data: categories } = useCachedPromise(listCategories, [], {
    initialData: [],
    failureToastOptions: { title: "Couldn't load categories" },
  });

  // Prefill from the clipboard if it looks like a URL — the common case is
  // "I just copied a link, save it".
  useEffect(() => {
    Clipboard.readText().then((text) => {
      if (text && /^https?:\/\//i.test(text.trim())) setUrl(text.trim());
    });
  }, []);

  async function handleSubmit(values: FormValues) {
    const target = values.url.trim();
    if (!/^https?:\/\//i.test(target)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter a valid URL",
      });
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving to Gather…",
    });
    try {
      await saveReferenceUrl(target, {
        categoryId:
          values.categoryId && values.categoryId !== "auto"
            ? values.categoryId
            : undefined,
      });
      toast.hide();
      await showHUD("Saved to Gather ✓");
      await popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      if (error instanceof GatherApiError && error.code === "limit_reached") {
        toast.title = "Free limit reached";
        toast.message = "Upgrade to Pro to save more references.";
      } else if (error instanceof GatherApiError && error.status === 409) {
        toast.title = "Already saved";
        toast.message = "This looks like a duplicate of an existing reference.";
      } else {
        toast.title = "Couldn't save";
        toast.message = error instanceof Error ? error.message : String(error);
      }
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save to Gather"
            icon={Icon.SaveDocument}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://…"
        value={url}
        onChange={setUrl}
        autoFocus
      />
      <Form.Dropdown id="categoryId" title="Category" defaultValue="auto">
        <Form.Dropdown.Item value="auto" title="Auto (let Gather decide)" />
        {categories?.map((c) => (
          <Form.Dropdown.Item key={c.id} value={c.id} title={c.name} />
        ))}
      </Form.Dropdown>
      <Form.Description text="Gather will fetch a preview and generate tags automatically." />
    </Form>
  );
}
