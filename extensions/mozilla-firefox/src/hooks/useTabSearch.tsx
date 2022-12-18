import fs from "fs";
import { useEffect, useState } from "react";
import { getPreferenceValues } from "@raycast/api";
import { Preferences, Tab } from "../interfaces";
import { decodeLZ4, getSessionActivePath, getSessionInactivePath } from "../util";

const decompressSession = async (): Promise<any> => {
  let sessionPath = await getSessionInactivePath();
  if (!fs.existsSync(sessionPath)) {
    sessionPath = await getSessionActivePath();
  }
  if (!fs.existsSync(sessionPath)) {
    throw new Error("No profile session file found.");
  }
  const fileBuffer = await fs.promises.readFile(sessionPath);
  return decodeLZ4(fileBuffer);
};

export function useTabSearch(query: string | undefined) {
  const { tabSessionManagerId } = getPreferenceValues<Preferences>();
  const [entries, setEntries] = useState<Tab[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  let cancel = false;

  useEffect(() => {
    async function getTabs() {
      if (cancel) {
        return;
      }

      try {
        let tabs: Tab[] = [];

        if (tabSessionManagerId) {
        } else {
          const session = await decompressSession();
          tabs = session.windows
            .map((w: any) => w.tabs.map((t: any) => t.entries.map((e: any) => ({ url: e.url, title: e.title }))[0]))
            .flat(2)
            .filter((t: Tab) => t.url !== "about:newtab")
            .map((e: any) => Tab.parse(e));
        }

        if (query) {
          tabs = tabs.filter((tab) => {
            return (
              tab.title.toLowerCase().includes(query.toLowerCase()) ||
              tab.urlWithoutScheme().toLowerCase().includes(query.toLowerCase())
            );
          });
        }

        setEntries(tabs);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        if (!cancel) {
          setIsLoading(false);
        }
      }
    }

    getTabs();

    return () => {
      cancel = true;
    };
  }, [query]);

  return { entries, error, isLoading };
}
