import { useCallback } from "react";
import { Clipboard, showHUD } from "@raycast/api";
import { CodeStash } from "../types";

const useCopy = () => {
  const handleCopy = useCallback(async (index: number, codeStashes: CodeStash[]) => {
    const codeStash = codeStashes[index];
    await Clipboard.copy(codeStash.code);
    await showHUD(`${codeStash.title} - Code copied`);
  }, []);

  return { handleCopy };
};

export default useCopy;
