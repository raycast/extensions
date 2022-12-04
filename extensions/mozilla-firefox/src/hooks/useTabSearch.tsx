import { useEffect, useState } from "react";
import { Tab } from "../interfaces";
import fs from "fs";
import { getSessionActivePath, getSessionInactivePath } from "../util";
import { decodeBlock as lz4DecodeBlock } from "../util";

const decompressSession = async (): Promise<any> => {
  let sessionPath = await getSessionInactivePath();
  if (!fs.existsSync(sessionPath)) {
    sessionPath = await getSessionActivePath();
  }
  if (!fs.existsSync(sessionPath)) {
    throw new Error("No profile session file found.");
  }
  const fileBuffer = await fs.promises.readFile(sessionPath);
  const u8sz = fileBuffer.slice(8, 12);
  const origLen = u8sz[0] + u8sz[1] * 256 + u8sz[2] * 256 * 256 + u8sz[3] * 256 * 256 * 256;
  // Extract compressed data (past mozilla jsonlz4 header of 12 bytes)
  const jsonStart = 12;
  const u8Comp = fileBuffer.slice(jsonStart);
  // Create LZ4 buffer
  const comp = Buffer.from(u8Comp);
  const orig = Buffer.alloc(origLen);
  // perform lz4 decompression
  const decompressedLen = lz4DecodeBlock(comp, orig);
  const data = orig.subarray(0, decompressedLen);
  return JSON.parse(data.toString());
};

export function useTabSearch(query: string | undefined) {
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
        const session = await decompressSession();
        let tabs: Tab[] = session.windows
          .map((w: any) => w.tabs.map((t: any) => t.entries.map((e: any) => ({ url: e.url, title: e.title }))[0]))
          .flat(2)
          .filter((t: Tab) => t.url !== "about:newtab")
          .map((e: any) => Tab.parse(e));

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
        console.error(e);
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
