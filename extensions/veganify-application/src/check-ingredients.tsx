import { List, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { IngredientResult } from "./models/IngredientResult";
import { IngredientListItem } from "./components/IngredientListItem";
import { checkIngredient } from "./utils/api";
import { debounce } from "./utils/debounce";
import EmptyList from "./components/EmptyList";
import { preprocessIngredients } from "./utils/preprocessIngredients";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<IngredientResult[]>([]);

  const debouncedCheckIngredients = useCallback(
    debounce(async (text: string) => {
      if (text.trim() === "") {
        setResults([]);
        return;
      }
      const ingredients = preprocessIngredients(text);
      try {
        const newResults = await Promise.all(ingredients.map(checkIngredient));
        setResults(newResults);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error checking ingredients",
          message: error instanceof Error ? error.message : "An unknown error occurred",
        });
      } finally {
        setIsLoading(false);
      }
    }, 800),
    [],
  );

  useEffect(() => {
    if (searchText) {
      setIsLoading(true);
    }
    debouncedCheckIngredients(searchText);
    return () => debouncedCheckIngredients.cancel();
  }, [searchText, debouncedCheckIngredients]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter ingredients separated by commas..."
      throttle
    >
      <EmptyList searchText={searchText} />
      {results.map((result, index) => (
        <IngredientListItem key={index} ingredient={result} />
      ))}
    </List>
  );
}
