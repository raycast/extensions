import { useState, useEffect } from "react";
import { Cache } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { exec } from "child_process";
import { shellEnv } from "shell-env";

interface Env {
  env: Record<string, string>;
}

let env: null | Env = null;
const cache = new Cache();

const path = cache.get("manpages-env-path");
if (path) {
  env = { env: { PATH: path } };
}

const command =
  "ls /usr/share/man/* /opt/homebrew/share/man/* /usr/local/man/* | sed -E -e 's/ *//' | sed -E -e 's/([^.,]*)\\.[n0-9](tcl)?$/\\1/' | sed -E -e 's/\\/usr\\/.*://' | sed -E -e 's/^[A-Z].*//'";

export function processEntryAdditions(crawledPages: string[]) {
  // Add man entries added since cache was last updated
  const cachedPages = cache.get("manPages");
  if (cachedPages) {
    const pageList = cachedPages.split("\n");

    for (const page of crawledPages) {
      if (pageList.indexOf(page) == -1) {
        pageList.push(page)
      }
    }

    cache.set("manPages", pageList.join("\n"))
  }
}

export function processEntryRemovals(crawledPages: string[]) {
  // Remove man entries deleted since cache was last updated
  const cachedPages = cache.get("manPages");
  if (cachedPages) {
    const pageList = cachedPages?.split("\n") 
    for (const page in pageList) {
      if (crawledPages.indexOf(page) == -1) {
        pageList.splice(pageList.indexOf(page), 1)
      }
    }
    cache.set("manPages", pageList.join("\n"));
  }
}

export function getCommands() {
  // Get all command names at once
  return new Promise(function (resolve: (value: string[]) => void) {
    runCommand(command, () => {null}, (res) => {
      const pageList = removeInvalidEntries(res.split("\n"))
      resolve(pageList)
    });
  })
}

function removeInvalidEntries(pageList: string[]) {
  // Remove invalid entries, empty entries, and duplicates
  const validPages: string[] = []
  for (const page of pageList) {
    if (
    !page.startsWith("-") &&
    !page.startsWith("/") &&
    !page.includes(".") &&
    page.trim().length > 1 &&
    validPages.findIndex((item) => page.toUpperCase() == item.toUpperCase()) == -1
    ) {
      validPages.push(page)
    }
  }
  return validPages
}

export function useGetManPages() {
  // Get list of command names incrementally
  const [pages, setPages] = useState<string[]>([]);
  const [crawledPages, setCrawledPages] = useState<string[]>([]);
  const [result, setResult] = useState<string>("");

  const cachedPages = cache.get("manPages");

  // Run the man list command
  useEffect(() => {
    if (!cachedPages)
      runCommand(command, setResult);
  }, []);

  // Populate the list of pages (IF no cached list exists)
  useEffect(() => {
    if (result != "") {
      const newEntries = result.split("\n")
      const pageList = removeInvalidEntries(newEntries.concat(crawledPages))
      setCrawledPages(pageList);
    }
  }, [result]);

  // Get the cached list of pages if it exists
  useEffect(() => {
    if (cachedPages != undefined && crawledPages.length == 0) {
      const pageList = cachedPages.split("\n");
      setPages(pageList);
    } else {
      setPages(crawledPages);
    }
  }, [crawledPages]);
  

  // Return empty list until data is loaded
  if (!pages?.length) {
    return [];
  }

  // Cache the current results
  cache.set("manPages", pages.join("\n"));

  // Return the list of pages
  return pages;
}

async function getEnv() {
  // Get the cached environment details, if they are present
  if (env) {
    return env;
  }

  const storedPath = cache.get("manpages-env-path");
  if (storedPath) {
    env = { env: { PATH: storedPath } };
    return env;
  }

  // Query for environment details and update the cache variable
  env = { env: await shellEnv() };

  // Cache environment variables
  cache.set("manpages-env-path", env.env.PATH);

  return env;
}

export async function runCommand(command: string, callback?: (res: string) => unknown, finish?: (res: string) => void) {
  // Run a terminal command
  env = await getEnv();
  const child = exec(command, env);
  let result = "";

  child.stdout?.on("data", (data: string) => {
    result = result + data;
    callback?.(result);
  });

  child.stdout?.on("close", () => {
    finish?.(result)
  })
}

export function openInTerminal(page: string) {
  // Show the man page in a new Terminal tab
  Promise.resolve(
    runAppleScript(`tell application "Terminal"
        activate
        do script "man ${page}"
    end tell`)
  );
}
