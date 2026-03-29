import { useLocalStorage } from "@raycast/utils";
import { useEffect } from "react";

export interface Snippet {
  code: string;
  content: string;
}

export function useSnippet() {
  const { value, setValue, isLoading } = useLocalStorage<Snippet[]>("snippets", []);
  const { value: oldPersonas } = useLocalStorage<Record<string, string>[]>("personas", []);

  useEffect(() => {
    if (!isLoading && (!value || value.length === 0) && oldPersonas && oldPersonas.length > 0) {
      const migrated: Snippet[] = oldPersonas.map((p) => ({
        code: p.code,
        content: p.persona || p.content,
      }));
      setValue(migrated);
    }
  }, [isLoading, value, oldPersonas]);

  const addSnippet = (code: string, content: string) => {
    const v = value || [];
    const index = v.findIndex((p) => p.code === code);

    if (index !== -1) {
      v[index] = { code, content };
    } else {
      v.push({ code, content });
    }

    setValue(v);
  };

  return { value, addSnippet };
}
