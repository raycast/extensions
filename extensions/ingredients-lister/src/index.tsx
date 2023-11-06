import {
  ActionPanel,
  Action,
  Icon,
  List,
  environment,
  AI,
  getSelectedText,
  Toast,
  showToast,
  popToRoot,
} from "@raycast/api";
import { useAI } from "@raycast/utils";
import { useEffect, useState } from "react";

export default function Command() {
  const [selectedText, setSelectedText] = useState("");

  try {
    useEffect(() => {
      (async () => {
        try {
          const text = await getSelectedText();
          setSelectedText(text);
        } catch (error) {
          // Handle error
          popToRoot();
          showToast({ style: Toast.Style.Failure, title: "Error", message: "Could not get selected text." });
        }
      })();
    }, []);
  } catch (error) {
    console.log("An error occurred in the promise:", error);
  }

  if (environment.canAccess(AI)) {
    try {
      const { data, isLoading } = useAI(
        `I will input an entire website that has to do with cooking a recipe.
        In a json with the name of the ingredient followed by its quantity (provide units), you will tell me all the ingredients I need to cook the food.
        Remember to ONLY return a JSON, and never add any other aknowledging text.
        Here's an example of the format I expect you to provide in your response:
        {
        "Ingredient": "Quantity With Units In SI and Metric equivalent rounded in parenthesis",
        }
        If no recipes are found, then return
        {
        "No ingredients found": "Please use a valid website"
        }
        \n${selectedText}
        `
      );

      if (isLoading) {
        // return a loading indicator
        return <List isLoading />;
      } else if (data) {
        // parse the data and render as a list
        const parsedData = JSON.parse(data);
        const items = Object.entries(parsedData).map(([ingredient, quantity]) => ({
          title: ingredient,
          accessory: {
            text: quantity,
          },
        }));

        return (
          <List>
            <List.Section title="Ingredients: (AI tends to make mistakes so use at your own risk)">
              {items.map((item) => (
                <List.Item
                  key={item.title}
                  title={item.title}
                  accessories={[{ text: String(item.accessory.text) }]}
                  icon={Icon.Circle}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard
                        title="Copy Ingredient with Quantity"
                        content={`${String(item.title)} - ${String(item.accessory.text)}`}
                      />
                      <Action.Paste
                        title="Paste Ingredient with Quantity"
                        content={`${String(item.title)} - ${String(item.accessory.text)}`}
                      />
                      <Action.CopyToClipboard title="Copy Ingredient" content={String(item.title)} />
                      <Action.Paste title="Paste Ingredient" content={String(item.accessory.text)} />
                      <Action.CopyToClipboard title="Copy Quantity" content={String(item.accessory.text)} />
                      <Action.Paste title="Paste Quantity" content={String(item.accessory.text)} />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          </List>
        );
      }
    } catch (error) {
      console.log("An error occurred while using AI:", error);
    }
  } else {
    console.log("No access to AI");
    showToast({ style: Toast.Style.Failure, title: "Error", message: "You do not have access Raycast AI." });
  }

  // fallback to rendering an empty list
  return <List />;
}
