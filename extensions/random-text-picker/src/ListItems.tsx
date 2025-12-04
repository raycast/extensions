import { Action, ActionPanel, Color, Icon } from "@raycast/api";
import {
  AddItemToList,
  DeleteAllItems,
  DeleteItem,
  RandomizeItems,
  ShuffleItem,
  SortItemsAlphebetically,
} from "./ListActions.js";

type ListItemsProps = {
  item: string;
  inputText: string;
  inputs: string[];
  setInputs: React.Dispatch<React.SetStateAction<string[]>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function ListItems({ item, inputText, inputs, setInputs, isLoading, setIsLoading }: ListItemsProps) {
  return (
    <ActionPanel>
      <Action
        title="Add Item to List"
        onAction={() => !isLoading && AddItemToList(inputText, inputs, setInputs)}
        icon={{ source: Icon.Plus }}
      />
      <Action
        title="Randomize!"
        onAction={() => !isLoading && RandomizeItems(inputs, setInputs, setIsLoading)}
        icon={{ source: Icon.Repeat }}
      />
      <Action
        title="Shuffle"
        onAction={() => !isLoading && ShuffleItem(inputs, setInputs)}
        shortcut={{ modifiers: ["cmd"], key: "s" }}
        icon={{ source: Icon.Shuffle }}
      />
      <Action
        title="Sort Alphebetically"
        onAction={() => !isLoading && SortItemsAlphebetically(inputs, setInputs)}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        icon={{ source: Icon.Uppercase }}
      />
      <Action
        title="Delete Item"
        onAction={() => !isLoading && DeleteItem(item, inputs, setInputs)}
        shortcut={{ modifiers: ["cmd"], key: "backspace" }}
        icon={{ source: Icon.Trash, tintColor: Color.Red }}
        style={Action.Style.Destructive}
      />
      <Action
        title="Delete All Items"
        onAction={() => !isLoading && DeleteAllItems(setInputs)}
        shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
        icon={{ source: Icon.Trash, tintColor: Color.Red }}
        style={Action.Style.Destructive}
      />
    </ActionPanel>
  );
}
