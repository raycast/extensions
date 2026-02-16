/**
 * Form field state management for the rename form.
 * Pure state container — no business logic.
 */

import { useState, useCallback } from "react";
import { useCachedState } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";
import { validateSeparator } from "../lib/validation";
import { CaseStyle } from "../types";

export interface UseRenameFormFieldsResult {
  newName: string;
  setNewName: (name: string) => void;
  prefix: string;
  setPrefix: (p: string) => void;
  suffix: string;
  setSuffix: (s: string) => void;
  preserveName: boolean;
  setPreserveName: (v: boolean) => void;
  separator: string;
  indexSeparator: string;
  startNumber: string;
  setStartNumber: (n: string) => void;
  paddingDigits: string;
  setPaddingDigits: (d: string) => void;
  caseStyle: CaseStyle;
  setCaseStyle: (c: CaseStyle) => void;
  independentNumbering: boolean;
  setIndependentNumbering: (v: boolean) => void;
  handleSeparatorChange: (type: "separator" | "indexSeparator", value: string) => Promise<void>;
}

export function useRenameFormFields(): UseRenameFormFieldsResult {
  const [newName, setNewName] = useState<string>("");
  const [prefix, setPrefix] = useState<string>("");
  const [suffix, setSuffix] = useState<string>("");
  const [preserveName, setPreserveName] = useCachedState<boolean>("preserveName", false);
  const [separator, setSeparator] = useState<string>("_");
  const [indexSeparator, setIndexSeparator] = useState<string>("-");
  const [startNumber, setStartNumber] = useState<string>("1");
  const [paddingDigits, setPaddingDigits] = useState<string>("0");
  const [caseStyle, setCaseStyle] = useState<CaseStyle>(CaseStyle.UNCHANGED);
  const [independentNumbering, setIndependentNumbering] = useState(false);

  const handleSeparatorChange = useCallback(async (separatorType: "separator" | "indexSeparator", value: string) => {
    const validation = validateSeparator(value);
    if (!validation.valid) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid separator",
        message: validation.error,
      });
      return;
    }

    if (separatorType === "separator") {
      setSeparator(value);
    } else {
      setIndexSeparator(value);
    }
  }, []);

  return {
    newName,
    setNewName,
    prefix,
    setPrefix,
    suffix,
    setSuffix,
    preserveName,
    setPreserveName,
    separator,
    indexSeparator,
    startNumber,
    setStartNumber,
    paddingDigits,
    setPaddingDigits,
    caseStyle,
    setCaseStyle,
    independentNumbering,
    setIndependentNumbering,
    handleSeparatorChange,
  };
}
