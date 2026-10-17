import { Clipboard, showToast, Toast } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useState } from "react";
import { FormValues } from "../types";
import { validateJSON } from "../lib/validate";

export const useJSONForm = (onCompare: (original: unknown, modified: unknown) => void) => {
  const [originalValue, setOriginalValue] = useState("");
  const [modifiedValue, setModifiedValue] = useState("");
  const [originalError, setOriginalError] = useState<string | undefined>();
  const [modifiedError, setModifiedError] = useState<string | undefined>();

  const updateOriginal = (val: string) => {
    setOriginalValue(val);
    setOriginalError(val.trim() === "" ? undefined : validateJSON(val));
  };

  const updateModified = (val: string) => {
    setModifiedValue(val);
    setModifiedError(val.trim() === "" ? undefined : validateJSON(val));
  };

  const { handleSubmit, itemProps, setValue } = useForm<FormValues>({
    onSubmit(values) {
      const origErr = validateJSON(values.original);
      if (origErr) {
        setOriginalError(origErr);
        return;
      }
      const modErr = validateJSON(values.modified);
      if (modErr) {
        setModifiedError(modErr);
        return;
      }
      const original = JSON.parse(values.original.trim());
      const modified = JSON.parse(values.modified.trim());
      onCompare(original, modified);
    },
  });

  const formatJSON = async () => {
    let origOk = false;
    let modOk = false;

    if (originalValue.trim() !== "") {
      try {
        const origParsed = JSON.parse(originalValue.trim());
        const formatted = JSON.stringify(origParsed, null, 2);
        setValue("original", formatted);
        updateOriginal(formatted);
        origOk = true;
      } catch {
        // skip invalid original
      }
    }
    if (modifiedValue.trim() !== "") {
      try {
        const modParsed = JSON.parse(modifiedValue.trim());
        const formatted = JSON.stringify(modParsed, null, 2);
        setValue("modified", formatted);
        updateModified(formatted);
        modOk = true;
      } catch {
        // skip invalid modified
      }
    }

    if (!origOk && !modOk) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Nothing to Format",
        message: "Both fields are empty or contain invalid JSON",
      });
    } else if (origOk && modOk) {
      await showToast({
        style: Toast.Style.Success,
        title: "Formatted Both JSONs",
      });
    } else {
      await showToast({
        style: Toast.Style.Success,
        title: `Formatted ${origOk ? "Original" : "Modified"} JSON`,
      });
    }
  };

  const swapJSON = () => {
    const temp = originalValue;
    setValue("original", modifiedValue);
    setValue("modified", temp);
    setOriginalValue(modifiedValue);
    setModifiedValue(temp);
  };

  const pasteFromClipboard = async (field: "original" | "modified") => {
    const text = await Clipboard.readText();
    if (text) {
      setValue(field, text);
      if (field === "original") setOriginalValue(text);
      else setModifiedValue(text);
      await showToast({
        style: Toast.Style.Success,
        title: `Pasted into ${field === "original" ? "Original" : "Modified"} JSON`,
      });
    }
  };

  return {
    originalValue,
    modifiedValue,
    originalError,
    modifiedError,
    handleSubmit,
    itemProps,
    updateOriginal,
    updateModified,
    formatJSON,
    swapJSON,
    pasteFromClipboard,
  };
};
