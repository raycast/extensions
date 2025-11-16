import { useEffect, useState } from "react";
import { FormValues } from "../types";
import { LocalStorage } from "@raycast/api";

export const usePersistentForm = (initialValues: FormValues, storageKey = "promptFormValues") => {
  const [formValues, setFormValues] = useState(initialValues);

  // Load saved values on mount
  useEffect(() => {
    const loadValues = async () => {
      const saved = await LocalStorage.getItem<string>(storageKey);
      if (saved) setFormValues(JSON.parse(saved));
    };
    loadValues();
  }, [storageKey]);

  // Save values on change
  const handleChange = (id: keyof FormValues, value: string | boolean) => {
    const newValues = { ...formValues, [id]: value };
    setFormValues(newValues);
    LocalStorage.setItem(storageKey, JSON.stringify(newValues));
  };

  const resetForm = () => {
    setFormValues(initialValues);
    LocalStorage.setItem(storageKey, JSON.stringify(initialValues));
  };

  return { formValues, handleChange, setFormValues, resetForm };
};
