import { Action, ActionPanel, Detail } from "@raycast/api";
import { FoodleRecipe, ParsedRecipe, LdPerson, LdImage } from "../utils/types";
import * as cheerio from "cheerio";
import { showFailureToast, useFetch } from "@raycast/utils";
import { ReactNode, useEffect, useState } from "react";
import { Recipe } from "schema-dts";

export default function RecipeDetail({ recipe }: { recipe: FoodleRecipe }) {
  const {
    isLoading,
    data: html,
    error,
  } = useFetch(recipe.url, {
    parseResponse(response) {
      return response.text();
    },
    keepPreviousData: true,
    initialData: "",
  });
  const [jsonLdRecipe, setJsonLdRecipe] = useState(null as ParsedRecipe | null);

  if (error) {
    showFailureToast(error);
  }

  useEffect(() => {
    if (html !== "" && jsonLdRecipe == null) {
      extractRecipeFromHtml(html);
    }
  }, [html, jsonLdRecipe]);

  function extractRecipeFromHtml(html: string) {
    const $ = cheerio.load(html);
    const ldEntries = $("script[type='application/ld+json']");

    ldEntries.each((_, element) => {
      const jsonRaw = $(element).html();
      if (jsonRaw) {
        try {
          const jsonParsed = JSON.parse(jsonRaw);

          // check for single jsonLd which only contains a recipe
          let jsonLdRecipe = mapToJsonLdRecipe(jsonParsed as Recipe);

          if (jsonLdRecipe != null) {
            setJsonLdRecipe(jsonLdRecipe);
          } else {
            let ldEntries = [];

            if (Array.isArray(jsonParsed)) {
              // jsonLd with an array of jsonLds
              ldEntries = jsonParsed;
            } else if (jsonParsed["@graph"] && Array.isArray(jsonParsed["@graph"])) {
              // jsonLd-graph with an array of jsonLds
              ldEntries = jsonParsed["@graph"];
            }

            for (const entry of ldEntries) {
              // check for each entry if it is a recipe
              jsonLdRecipe = mapToJsonLdRecipe(entry as Recipe);
              if (jsonLdRecipe != null) {
                setJsonLdRecipe(jsonLdRecipe);
              }
            }
          }
        } catch (error) {
          showFailureToast(error, { title: "Failed to parse recipe data" });
        }
      }
    });
  }

  const [markdown, metadata] = renderRecipe(recipe, jsonLdRecipe);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={recipe.name}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {metadata.map((item) => {
            return item;
          })}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={recipe.url} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function renderRecipe(foodleRecipe: FoodleRecipe, parsedRecipe: ParsedRecipe | null): [string, ReactNode[]] {
  const imageUrl = parsedRecipe && parsedRecipe.image ? parsedRecipe.image : foodleRecipe.imageUrl;
  let markdown: string = "# " + foodleRecipe.name + "\n\n!";
  if (imageUrl !== "" && imageUrl !== null) {
    markdown += "[" + foodleRecipe.name + "](" + imageUrl + ")";
  }

  if (parsedRecipe == null) {
    markdown += "\n\nCould not extract recipe data from the page. Please open the recipe in your browser\n\n";
  } else {
    if (parsedRecipe.description) {
      markdown += "\n\n## Description\n" + parsedRecipe.description + "\n\n";
    }

    if (parsedRecipe.ingredients) {
      markdown = markdown + "## Ingredients\n- ";
      markdown += parsedRecipe.ingredients.join("\n- ") + "\n\n";
    }

    if (parsedRecipe.instructions) {
      markdown = markdown + "## Instructions\n";
      markdown += Object.entries(parsedRecipe.instructions)
        .filter(([, howToStep]) => howToStep["@type"] === "HowToStep")
        .map(([, howToStep]) => `- ${howToStep.text}\n`)
        .join("");
    }
  }

  const metadata = [];
  if (parsedRecipe) {
    if (parsedRecipe.author) {
      metadata.push(<Detail.Metadata.Label key="author" title="Author" text={parsedRecipe.author} />);
      metadata.push(<Detail.Metadata.Separator key="separator-author" />);
    }

    let hasTimeInfo = false;
    if (parsedRecipe.prepTime) {
      metadata.push(<Detail.Metadata.Label key="prepTime" title="Prep Time" text={parsedRecipe.prepTime} />);
      hasTimeInfo = true;
    }
    if (parsedRecipe.cookTime) {
      metadata.push(<Detail.Metadata.Label key="cookTime" title="Cook Time" text={parsedRecipe.cookTime} />);
      hasTimeInfo = true;
    }
    if (parsedRecipe.totalTime) {
      metadata.push(<Detail.Metadata.Label key="totalTime" title="Total Time" text={parsedRecipe.totalTime} />);
      hasTimeInfo = true;
    }
    if (hasTimeInfo) {
      metadata.push(<Detail.Metadata.Separator key="separator-timings" />);
    }

    if (parsedRecipe.recipeYield) {
      metadata.push(<Detail.Metadata.Label key="recipeYield" title="Yield" text={parsedRecipe.recipeYield} />);
    }
    if (parsedRecipe.recipeCategory) {
      metadata.push(<Detail.Metadata.Label key="recipeCategory" title="Category" text={parsedRecipe.recipeCategory} />);
    }
  }

  return [markdown, metadata];
}

function formatISODuration(isoDuration: string | null) {
  if (!isoDuration) return null;

  // Regular expression to parse the ISO 8601 duration
  const regex = /P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/;
  const matches = isoDuration.match(regex);

  if (!matches) return "Invalid Duration";

  // Extracting the time units
  const [, years, months, weeks, days, hours, minutes, seconds] = matches.map((v) => parseInt(v) || 0);

  // Building a readable format
  const parts = [];
  if (years) parts.push(`${years} year${years > 1 ? "s" : ""}`);
  if (months) parts.push(`${months} month${months > 1 ? "s" : ""}`);
  if (weeks) parts.push(`${weeks} week${weeks > 1 ? "s" : ""}`);
  if (days) parts.push(`${days} day${days > 1 ? "s" : ""}`);
  if (hours) parts.push(`${hours} hour${hours > 1 ? "s" : ""}`);
  if (minutes) parts.push(`${minutes} minute${minutes > 1 ? "s" : ""}`);
  if (seconds) parts.push(`${seconds} second${seconds > 1 ? "s" : ""}`);

  return parts.length > 0 ? parts.join(", ") : null;
}

function mapToJsonLdRecipe(json: Recipe): ParsedRecipe | null {
  if (json["@type"] == "Recipe") {
    let imageUrl: string | null = null;

    if (Array.isArray(json.image)) {
      if (typeof json.image[0] == "object") {
        const image = json.image[0] as LdImage;
        if (image.url) {
          imageUrl = image.url;
        }
      } else {
        imageUrl = json.image[0];
      }
    } else if (typeof json.image == "string") {
      imageUrl = json.image;
    }

    return {
      name: json.name || "",
      author: json.author ? (typeof json.author == "object" ? (json.author as LdPerson).name : json.author) : "",
      prepTime: formatISODuration(json.prepTime as string) || json.prepTime,
      cookTime: formatISODuration(json.cookTime as string) || json.cookTime,
      totalTime: formatISODuration(json.totalTime as string) || json.totalTime,
      recipeYield: json.recipeYield ? json.recipeYield.toString() : "",
      recipeCategory: Array.isArray(json.recipeCategory) ? json.recipeCategory.join(", ") : json.recipeCategory || "",
      description: json.description || "",
      image: imageUrl,
      ingredients:
        json.recipeIngredient && typeof json.recipeIngredient == "string"
          ? [json.recipeIngredient]
          : json.recipeIngredient,
      instructions:
        json.recipeInstructions && typeof json.recipeInstructions == "string"
          ? [json.recipeInstructions]
          : json.recipeInstructions,
    } as ParsedRecipe;
  }

  return null;
}
