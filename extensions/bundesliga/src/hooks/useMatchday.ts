import { useEffect, useState } from "react";
import { getMatchday } from "../api";
import { LiveBlogEntryItem } from "../types/firebase";

export const useMatchday = (url: string) => {
  const [entries, setEntries] = useState<LiveBlogEntryItem[]>();

  useEffect(() => {
    getMatchday(url).then((data) => {
      setEntries(data ? Object.values(data) : []);
    });
  }, [url]);

  return entries;
};
