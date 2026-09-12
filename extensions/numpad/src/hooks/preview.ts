import { Clipboard, showHUD, closeMainWindow } from "@raycast/api";
import { useDeferredValue, useState } from "react";
import { Symbols } from "..";
import { useFavorites } from "./favorites";

export type ContextProps = ReturnType<typeof usePreview>;

export const usePreview = () => {
  const { favorites, save, unSave, deleteAllSaves } = useFavorites();
  const [currentValue, setCurrentValue] = useState("");
  const preview = useDeferredValue(currentValue);

  const onSubmit = async () => {
    if (!currentValue.length) return;
    setCurrentValue("");
    await Clipboard.copy(currentValue);
    await Clipboard.paste(currentValue);
    await showHUD("Copied to clipboard");
  };

  const copyAndClose = async () => {
    if (!currentValue.length) return;
    setCurrentValue("");
    await Clipboard.copy(currentValue);
    await closeMainWindow({ clearRootSearch: true });
    await showHUD("Copied to clipboard");
  };

  const clear = () => setCurrentValue("");

  const undo = () => setCurrentValue((p) => p.slice(0, -1));

  const onAction = (input: Symbols) => {
    switch (input) {
      case "finish":
        return onSubmit();
      case "clean":
        return clear();
      case "undo":
        return undo();
      case "save":
        return save(currentValue);
      case "unSave":
        setCurrentValue("");
        return unSave(currentValue);
      default:
        setCurrentValue((p) => p + input);
    }
  };

  return {
    preview,
    onSubmit,
    copyAndClose,
    onAction,
    favorites,
    deleteAllSaves,
    setCurrentValue,
  };
};
