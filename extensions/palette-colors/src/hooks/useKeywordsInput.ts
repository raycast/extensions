import { showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { UpdateKeywordsPromiseResult, UseKeywordsInputObject } from "../types";
import { useKeywordUpdateToasts } from "./useKeywordUpdateToasts";

/**
 * Holds the Update Keywords text field. Keywords are applied only through the
 * Add Keywords action (the primary action while the field is focused), never
 * on blur, so moving to another field does not change the keyword list.
 */
export function useKeywordsInput(onUpdate: (keywordsText: string) => Promise<UpdateKeywordsPromiseResult>): {
  keywordsInput: UseKeywordsInputObject;
} {
  const [text, setText] = useState("");
  const { showUpdateResult } = useKeywordUpdateToasts();

  const hasPending = text.trim().length > 0;

  const apply = async () => {
    if (!hasPending) return;
    const result = await onUpdate(text);
    showUpdateResult(result);
    setText("");
  };

  /** Returns true when the form can be saved; warns about keywords that were typed but not added. */
  const confirmNoPending = () => {
    if (!hasPending) return true;
    showToast({
      style: Toast.Style.Failure,
      title: "Keywords Not Added",
      message: "Add or clear the text in Update Keywords first.",
    });
    return false;
  };

  return {
    keywordsInput: {
      text,
      setText,
      hasPending,
      apply,
      confirmNoPending,
    },
  };
}
