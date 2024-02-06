import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { StoredCode } from "../types";

export default function useStoredRecents() {
  const [recents, setRecents] = useState<StoredCode[]>([]);

  useEffect(() => {
    const fetchRecents = async () => {
      const storedRecents = await LocalStorage.getItem<string>("recents");
      const parsedRecents = storedRecents ? JSON.parse(storedRecents ?? "") : [];
      setRecents(parsedRecents);
    };

    fetchRecents();
  }, []);

  const addRecent = (code: StoredCode) => {
    const newRecents = [code, ...recents];
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

  return { recents, addRecent, clearRecents, deleteRecent, checkRecent };
}
