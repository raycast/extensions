import { Toast, clearSearchBar, showToast } from "@raycast/api";
import RandomPicker from "./RandomPicker.js";

export async function AddItemToList(inputText: string, inputs: string[], setInputs: (arg0: string[]) => void) {
  if (inputText !== "") {
    setInputs([...inputs, inputText]);
    await clearSearchBar();
    await showToast({
      style: Toast.Style.Success,
      title: `Added "${inputText}" to the list`,
    });
  }
}

export function RandomizeItems(
  inputs: string[],
  setInputs: (arg0: string[]) => void,
  setIsLoading: (arg0: boolean) => void
) {
  RandomPicker(inputs, setInputs, setIsLoading);
}

export async function ShuffleItem(inputs: string[], setInputs: (arg0: string[]) => void) {
  const tempInputs = [...inputs];
  setInputs(shuffle(tempInputs));
  await showToast({
    style: Toast.Style.Success,
    title: "Shuffled the list",
  });
}

const shuffle = (array: string[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

export async function SortItemsAlphebetically(inputs: string[], setInputs: (arg0: string[]) => void) {
  const tempInputs = [...inputs];
  setInputs(tempInputs.sort());
  await showToast({
    style: Toast.Style.Success,
    title: "Sorted the list alphebatically",
  });
}

export async function DeleteItem(item: string, inputs: string[], setInputs: (arg0: string[]) => void) {
  setInputs(inputs.filter((i) => i !== item));
  await showToast({
    style: Toast.Style.Failure,
    title: `Deleted "${item}" from the list`,
  });
}

export async function DeleteAllItems(setInputs: (arg0: string[]) => void) {
  setInputs([]);
  await showToast({
    style: Toast.Style.Failure,
    title: `Deleted all items from the list`,
  });
}
