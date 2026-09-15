import { useEffect, useState } from "react";
import { Action, ActionPanel, Clipboard, Detail, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ConfigErrorView } from "./components/ConfigErrorView";
import { AddIngredientsAction } from "./components/AddIngredientsAction";
import { PlanRecipeAction } from "./components/PlanRecipeAction";
import { useGroupSlug, useMealie } from "./hooks/useMealie";
import { getRecipe, importRecipeFromUrl } from "./api/recipes";
import { extractUrl } from "./lib/clipboardUrl";
import { recipeWebUrl } from "./lib/urls";
import type { RecipeSummary } from "./types";

export default function ImportRecipe() {
  const { client, config, configError } = useMealie();
  const { push } = useNavigation();
  const [defaultUrl, setDefaultUrl] = useState<string>();
  const [urlError, setUrlError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    Clipboard.readText()
      .then((text) => setDefaultUrl(extractUrl(text) ?? ""))
      .catch(() => setDefaultUrl(""));
  }, []);

  if (configError) return <ConfigErrorView error={configError} />;

  async function submit(values: { url: string; includeTags: boolean }) {
    const url = extractUrl(values.url);
    if (!url) {
      setUrlError("Enter a valid http or https URL");
      return;
    }
    setUrlError(undefined);
    setIsLoading(true);

    const toast = await showToast({ style: Toast.Style.Animated, title: "Importing recipe" });
    try {
      const slug = await importRecipeFromUrl(client!, url, values.includeTags);
      const recipe = await getRecipe(client!, slug);
      toast.style = Toast.Style.Success;
      toast.title = "Imported";
      toast.message = recipe.name;
      push(<ImportResult recipe={recipe} baseUrl={config!.baseUrl} sourceUrl={url} />);
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, { title: "Mealie could not import this URL" });
    } finally {
      setIsLoading(false);
    }
  }

  if (defaultUrl === undefined) return <Form isLoading />;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Download} title="Import Recipe" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="Recipe URL"
        placeholder="https://example.org/some-recipe"
        defaultValue={defaultUrl}
        error={urlError}
        onChange={() => setUrlError(undefined)}
        autoFocus
      />
      <Form.Checkbox id="includeTags" title="Tags" label="Import tags from the source" defaultValue={false} />
      <Form.Description text="Mealie scrapes the page on the server. Check the recipe name afterwards, redirects can make the scraper land on a different page." />
    </Form>
  );
}

function ImportResult({ recipe, baseUrl, sourceUrl }: { recipe: RecipeSummary; baseUrl: string; sourceUrl: string }) {
  const { client } = useMealie();
  const groupSlug = useGroupSlug(client);

  const markdown = [
    "# " + recipe.name,
    "",
    recipe.description ?? "_No description_",
    "",
    "---",
    "",
    "Imported from: " + sourceUrl,
    "",
    "**Check that this is the recipe you expected.**",
  ].join("\n");

  return (
    <Detail
      markdown={markdown}
      navigationTitle="Import Result"
      actions={
        <ActionPanel>
          {groupSlug && (
            <Action.OpenInBrowser title="Open in Mealie" url={recipeWebUrl(baseUrl, groupSlug, recipe.slug)} />
          )}
          {client && <PlanRecipeAction client={client} recipe={recipe} />}
          {client && <AddIngredientsAction client={client} recipe={recipe} />}
          <Action.OpenInBrowser title="Open Original Source" url={sourceUrl} />
        </ActionPanel>
      }
    />
  );
}
