import { ActionPanel, Action, List, Icon, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";

interface IngredientsCheckResponse {
  code: string;
  status: string;
  message: string;
  data: DataDetails;
}

interface DataDetails {
  vegan: boolean;
}

interface IngredientResult {
  name: string;
  isVegan: boolean | null;
  error?: string;
}

const API_BASE_URL = "https://api.veganify.app/v0";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<IngredientResult[]>([]);

  useEffect(() => {
    const checkIngredients = async () => {
      if (searchText.trim() === "") {
        setResults([]);
        return;
      }

      setIsLoading(true);
      const ingredients = searchText
        .split(",")
        .map((i) => i.trim())
        .filter((i) => i !== "");
      const newResults: IngredientResult[] = [];

      for (const ingredient of ingredients) {
        try {
          const response = await fetch(`${API_BASE_URL}/ingredients/${encodeURIComponent(ingredient)}`);
          if (response.status === 429) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Rate limit exceeded",
              message: "Please try again in a minute.",
            });
            continue;
          }
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = (await response.json()) as IngredientsCheckResponse;
          newResults.push({
            name: ingredient,
            isVegan: data.data.vegan,
          });
        } catch (error) {
          console.error(`Error checking ingredient ${ingredient}:`, error);
          newResults.push({
            name: ingredient,
            isVegan: null,
            error: error instanceof Error ? error.message : "An unknown error occurred",
          });
        }
      }

      setResults(newResults);
      setIsLoading(false);
    };

    const debounce = setTimeout(checkIngredients, 300);
    return () => clearTimeout(debounce);
  }, [searchText]);

  if (searchText.trim() === "") {
    return (
      <List
        searchBarPlaceholder="Enter ingredients separated by commas..."
        onSearchTextChange={(newSearchText) => {
          setSearchText(newSearchText);
        }}
      >
        <List.EmptyView
          icon={{ source: "vgc.svg" }}
          title="Welcome to Veganify"
          description={`
Just enter the ingredients you want to check, separated by commas.
Veganify will instantly show you the vegan status of each ingredient.
          `}
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter ingredients separated by commas..."
      throttle
    >
      {results.map((result, index) => (
        <IngredientListItem key={index} ingredient={result} />
      ))}
    </List>
  );
}

function IngredientListItem({ ingredient }: { ingredient: IngredientResult }) {
  let icon = Icon.QuestionMark;
  let statusText = "Unknown";

  if (ingredient.error) {
    icon = Icon.ExclamationMark;
    statusText = "Error: " + ingredient.error;
  } else if (ingredient.isVegan === true) {
    icon = Icon.CheckCircle;
    statusText = "Likely Vegan";
  } else if (ingredient.isVegan === false) {
    icon = Icon.XMarkCircle;
    statusText = "Not Vegan";
  }

  return (
    <List.Item
      title={ingredient.name}
      icon={icon}
      accessories={[{ text: statusText }]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Ingredient Status"
            content={`${ingredient.name}: ${statusText}`}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}
