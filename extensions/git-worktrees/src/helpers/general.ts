import { getPreferences, resizeEditorWindow } from "#/helpers/raycast";
import { confirmAlert, open } from "@raycast/api";
import childProcess, { ExecOptions } from "node:child_process";
import { dirname } from "node:path";
import { promisify } from "node:util";
import parseUrl from "parse-url";

const exec = promisify(childProcess.exec);

export const executeCommand = async (command: string, options?: ExecOptions) => {
  const execOptions: ExecOptions = {
    ...options,
    cwd: options?.cwd,
    // shell: "/opt/homebrew/bin/zsh",
    // shell: "/bin/zsh",
    // timeout: 5 * 1000
  };

  return exec(command, execOptions);
  // return exec(`[ -f /opt/homebrew/bin/brew ] && eval "$(/opt/homebrew/bin/brew shellenv)" && ${command}`, execOptions);
};

export const batchPromises = async <T, R>(
  items: T[],
  batchSize: number,
  processFn: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map(processFn));

    batchResults.forEach((result) => {
      if (result.status === "rejected") return console.error({ result });

      results.push(result.value);
    });
  }

  return results;
};

/**
 * Removes the first and last characters from a given string.
 *
 * @param {string} string - The string to remove the first and last characters from.
 * @returns {string} The modified string with the first and last characters removed.
 *
 * @example
 * const string = "!Hello, world!";
 * const modifiedString = removeFirstAndLastCharacter(string);
 * console.log(modifiedString); // Output: "Hello, world"
 */
export const removeFirstAndLastCharacter = (string: string): string => string.slice(1, -1);

/**
 * Removes all new line characters from a given string.
 *
 * @param {string} string - The string to remove new line characters from.
 * @returns {string} The modified string with new line characters removed.
 *
 * @example
 * const string = "Hello,\nworld!";
 * const modifiedString = removeNewLine(string);
 * console.log(modifiedString); // Output: "Hello, world!"
 */
export const removeNewLine = (string: string): string => string.replace(/\n/g, "");

/**
 * Traverses up the directory hierarchy from a given path.
 *
 * @param {string} path - The path to traverse up from.
 * @returns {string} The path of the parent directory.
 *
 * @example
 * const path = "/path/to/file.txt";
 * const parentPath = traverseUpDirectory(path);
 * console.log(parentPath); // Output: "/path/to"
 */
export const traverseUpDirectory = (path: string): string => dirname(path);

/**
 * Parses a URL string and returns a ParsedUrl object
 * @param {string} url - The URL string to be parsed
 * @returns {parseUrl.ParsedUrl | null} The parsed URL object or null if the URL is invalid
 */
export const parseUrlSafe = (url: string): parseUrl.ParsedUrl | null => {
  try {
    return parseUrl(url);
  } catch {
    return null;
  }
};

/**
 * Checks if the provided string is a valid Git clone URL
 * @param {string} url - The URL string to be validated
 * @returns {boolean} True if the URL is a valid Git clone URL, otherwise false
 */
export const isGitCloneUrl = (url: string): boolean => {
  const gitUrlPattern =
    /^(([A-Za-z0-9]+@|http(|s):\/\/)|(http(|s):\/\/[A-Za-z0-9]+@))([A-Za-z0-9.]+(:\d+)?)(?::|\/)([\d/\w.-]+?)(\.git){1}$/i;
  return gitUrlPattern.test(url);
};

export const runWithAbort = <T>(signal: AbortSignal, asyncFunction: () => Promise<T>) => {
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error("Operation was aborted"));
      return;
    }

    const abortHandler = () => {
      reject(new Error("Operation was aborted"));
    };

    signal.addEventListener("abort", abortHandler);

    asyncFunction()
      .then(resolve)
      .catch(reject)
      .finally(() => {
        signal.removeEventListener("abort", abortHandler);
      });
  });
};

export const sortBranches = (incomingArr: string[]) => {
  const arr = [...incomingArr];

  const customSort = (a: string, b: string) => {
    // Check if a or b is "main" or "master"
    const aIsMainOrMaster = /^(main|master)$/i.test(a);
    const bIsMainOrMaster = /^(main|master)$/i.test(b);

    if (aIsMainOrMaster && bIsMainOrMaster) {
      // If both a and b are "main" or "master", sort them lexicographically
      return a.localeCompare(b);
    } else if (aIsMainOrMaster) {
      // If only a is "main" or "master", prioritize it to be at the top
      return -1;
    } else if (bIsMainOrMaster) {
      // If only b is "main" or "master", prioritize it to be at the top
      return 1;
    } else {
      // Otherwise, sort them lexicographically
      return a.localeCompare(b);
    }
  };

  // Sort the array using the custom sorting function
  arr.sort(customSort);

  return arr;
};

export const shouldOpenWorktree = async ({ path, branch }: { path: string; branch: string }) => {
  const { shouldAutomaticallyOpenWorktree, editorApp } = getPreferences();

  if (!editorApp) return;

  if (shouldAutomaticallyOpenWorktree === "no") return;

  if (shouldAutomaticallyOpenWorktree === "ask") {
    const confirmed = await confirmAlert({
      title: `Do you want to open '${branch}' with ${editorApp.name}?`,
    });

    if (!confirmed) return;
  }

  await open(path, editorApp.bundleId);

  return resizeEditorWindow(editorApp);
};
