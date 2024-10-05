import { List, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { IngredientResult } from "./models/IngredientResult";
import { IngredientListItem } from "./components/IngredientListItem";
import { checkIngredient } from "./utils/api";
import EmptyList from "./components/EmptyList";
import { preprocessIngredients } from "./utils/preprocessIngredients";

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
      const ingredients = preprocessIngredients(searchText);

      try {
        const newResults = await Promise.all(ingredients.map(checkIngredient));
        setResults(newResults);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error checking ingredients",
          message:
            error instanceof Error
              ? error.message
              : "An unknown error occurred",
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkIngredients();
  }, [searchText]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter ingredients separated by commas..."
      throttle
    >
      {searchText.trim() === "" ? (
        <EmptyList />
      ) : (
        results.map((result, index) => (
          <IngredientListItem key={index} ingredient={result} />
        ))
      )}
    </List>
  );
}
