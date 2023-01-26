import { useState, useEffect } from "react";
import { Cache, getPreferenceValues } from "@raycast/api";
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

interface Preferences {
  // Directories to look for man page entries in
  manPageDirectories: string;
}

export function processEntryAdditions(crawledPages: string[]) {
  // Add man entries added since cache was last updated
  const cachedPages = cache.get("manPages");
  if (cachedPages) {
    const pageList = cachedPages.split("\n");
    for (const page of crawledPages) {
      if (pageList.indexOf(page) == -1) {
        pageList.push(page);
      }
    }
    cache.set("manPages", pageList.join("\n"));
  }
}

export function processEntryRemovals(crawledPages: string[]) {
  // Remove man entries deleted since cache was last updated
  const cachedPages = cache.get("manPages");
  if (cachedPages) {
    const pageList = cachedPages?.split("\n");
    for (const page in pageList) {
      if (crawledPages.indexOf(page) == -1) {
        pageList.splice(pageList.indexOf(page), 1);
      }
    }
    cache.set("manPages", pageList.join("\n"));
  }
}

function getCrawlCommand() {
  // Construct the terminal command to find man entries in the user's preference-specified directories
  const { manPageDirectories } = getPreferenceValues<Preferences>();
  let parsedDirectories = "/usr/share/man/* /opt/homebrew/share/man/* /usr/local/man/*";
  if (manPageDirectories.includes("/")) {
    const directories = manPageDirectories.split(",").map((directory) => {
      let directoryPath = directory.trim();
      if (!directoryPath.endsWith("/")) {
        directoryPath = `${directoryPath}/`;
      }
      return `${directoryPath}*`;
    });
    parsedDirectories = directories.join(" ");
  }
  return `ls ${parsedDirectories} | sed -E -e 's/ *//' | sed -E -e 's/([^.,]*)\\.[n0-9](tcl)?$/\\1/' | sed -E -e 's/\\/usr\\/.*://' | sed -E -e 's/^[A-Z].*//'`;
}

export function getCommands() {
  // Get all command names at once
  return new Promise(function (resolve: (value: string[]) => void) {
    runCommand(
      getCrawlCommand(),
      () => {
        null;
      },
      (res) => {
        const pageList = removeInvalidEntries(res.split("\n"));
        resolve(pageList);
      }
    );
  });
}

function removeInvalidEntries(pageList: string[]) {
  // Remove invalid entries, empty entries, and duplicates
  const validPages: string[] = [];
  for (const page of pageList) {
    if (
      !page.match(/(^-.*)|(^\/.*)|(.*\.1.*)/) &&
      page.trim().length > 1 &&
      validPages.findIndex((item) => page.toUpperCase() == item.toUpperCase()) == -1
    ) {
      validPages.push(page);
    }
  }
  return validPages;
}

export function useGetManPages() {
  // Get list of command names incrementally
  const [pages, setPages] = useState<string[]>([]);
  const [result, setResult] = useState<string>("");

  const cachedPages = cache.get("manPages");

  // Run the man list command
  useEffect(() => {
    if (!cachedPages) {
      runCommand(getCrawlCommand(), setResult);
    }
  }, []);

  // Crawl for new man page entries
  useEffect(() => {
    if (result != "") {
      const newEntries = result.split("\n");
      const pageList = removeInvalidEntries(newEntries.concat(pages));
      setPages(pageList);
      cache.set("manPages", pageList.join("\n"));
    }
  }, [result]);

  // Get the cached list of pages if it exists
  useEffect(() => {
    if (cachedPages != undefined) {
      const pageList = cachedPages.split("\n");
      setPages(pageList);
    }
  }, []);

  // Return the list of pages
  return !pages?.length ? [] : pages;
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

export async function runCommand(
  command: string,
  callback?: (res: string) => unknown,
  finish?: (res: string) => void,
  keepResult?: boolean
) {
  // Run a terminal command
  env = await getEnv();
  const child = exec(command, env);
  let result = "";

  child.stdout?.on("data", (data: string) => {
    if (keepResult == undefined || keepResult == true) {
      result = result + data;
      callback?.(result);
    } else {
      callback?.(data);
    }
  });

  child.stdout?.on("close", () => {
    finish?.(result);
  });
}

export function runInTerminal(command: string) {
  // Run a command in Terminal.app
  Promise.resolve(
    runAppleScript(`tell application "Terminal"
        activate
        do script "${command}"
    end tell`)
  );
}

export function openInTerminal(page: string) {
  // Show the man page in a new Terminal tab
  runInTerminal(`man ${page}`);
}
