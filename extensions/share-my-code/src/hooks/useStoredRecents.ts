import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { CodeCheckResponse, StoredCode } from "../types";
import got from "got";
import { baseURL } from "../Constants";

export default function useStoredRecents() {
  const [recents, setRecents] = useState<StoredCode[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchRecents = async () => {
      setIsLoading(true);
      const storedRecents = await LocalStorage.getItem<string>("recents");
      let parsedRecents = storedRecents ? JSON.parse(storedRecents ?? "") : [];

      parsedRecents = await Promise.all(
        parsedRecents.map(async (recent: StoredCode) => {
          const { body } = await got.post(`${baseURL}/code_check.php?slug=${recent.slug}`);
          const parsedBody: CodeCheckResponse = JSON.parse(body);
          if (parsedBody.size !== 0) {
            return recent;
          }
          return null;
        }),
      );

      parsedRecents = parsedRecents.filter((recent: StoredCode) => recent !== null);

      setRecents(parsedRecents);
      await LocalStorage.setItem("recents", JSON.stringify(parsedRecents));
      setIsLoading(false);
    };

    fetchRecents();
  }, []);

  const addRecent = (code: StoredCode) => {
    const existingIndex = recents.findIndex((r) => r.slug === code.slug);
    let newRecents = [];
    if (existingIndex !== -1) {
      newRecents = [...recents];
      newRecents[existingIndex] = code;
    } else {
      newRecents = [code, ...recents];
    }
    setRecents(newRecents);
    LocalStorage.setItem("recents", JSON.stringify(newRecents));
  };

  const clearRecents = () => {
    setRecents([]);
    LocalStorage.removeItem("recents");
  };

  const deleteRecent = (slug: string) => {
    const newRecents = recents.filter((r) => r.slug !== slug);
    setRecents(newRecents);
    LocalStorage.setItem("recents", JSON.stringify(newRecents));
  };

  const checkRecent = (slug: string) => {
    return recents.some((r) => r.slug === slug);
  };

  return { recents, addRecent, clearRecents, deleteRecent, checkRecent, isLoading };
}
