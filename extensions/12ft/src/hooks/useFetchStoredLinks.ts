import { LocalStorage } from "@raycast/api";
import { useEffect } from "react";
import { Link } from "../types/link";

export function useFetchStoredLinks(setLinks: (links: Link[]) => void, setIsLoading: (isLoading: boolean) => void) {
  useEffect(() => {
    setIsLoading(true);
    async function fetchLinksFromLocalStorage() {
      const storedLinksObject = await LocalStorage.allItems<Record<string, string>>();
      if (!Object.keys(storedLinksObject).length) {
        setIsLoading(false);
        return;
      }

      const storedLinks: Link[] = [];
      for (const key in storedLinksObject) {
        const storedLink = JSON.parse(storedLinksObject[key]);
        storedLinks.push(storedLink);
      }
      setLinks(storedLinks);
      setIsLoading(false);
    }
    fetchLinksFromLocalStorage();
  }, []);
}
