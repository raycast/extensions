import React from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  Toast,
  getPreferenceValues,
  open,
  popToRoot,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Preferences, baseUrl, groupSlug, importRecipeFromUrl } from "./api";

type Values = {
  url: string;
};

function guessRecipeUrlFromResponse(result: unknown): string | undefined {
  if (!result || typeof result !== "object") return undefined;
  const maybe = result as {
    slug?: string;
    name?: string;
    recipe?: { slug?: string };
  };
  const slug = maybe.slug || maybe.recipe?.slug;
  if (!slug) return undefined;
  return `${baseUrl()}/g/${encodeURIComponent(groupSlug())}/r/${encodeURIComponent(slug)}`;
}

export default function Command() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    Clipboard.readText().then((text) => {
      if (text?.startsWith("http://") || text?.startsWith("https://"))
        setUrl(text);
    });
  }, []);

  async function submit(values: Values) {
    const recipeUrl = values.url.trim();

    if (!recipeUrl.startsWith("http://") && !recipeUrl.startsWith("https://")) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid URL",
        message: "Enter a full http(s) URL.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Importing recipe…",
      });
      const result = await importRecipeFromUrl(recipeUrl);
      const importedUrl = guessRecipeUrlFromResponse(result);
      const prefs = getPreferenceValues<Preferences>();

      toast.style = Toast.Style.Success;
      toast.title = "Recipe imported";
      toast.message = importedUrl
        ? "Opening in Mealie…"
        : "Open Mealie to review the imported recipe.";

      if (prefs.openImportedRecipe && importedUrl) {
        await open(importedUrl);
        await popToRoot();
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await showToast({
        style: Toast.Style.Failure,
        title: "Import failed",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Import Recipe"
            icon={Icon.Download}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="Recipe URL"
        placeholder="https://example.com/recipe"
        value={url}
        onChange={setUrl}
      />
      <Form.Description text="Tip: copy a recipe URL before opening this command; it will be filled automatically." />
    </Form>
  );
}
