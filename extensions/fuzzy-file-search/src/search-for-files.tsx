import { ActionPanel, List, Action, getPreferenceValues, environment, showToast, Toast } from "@raycast/api";
import { useCachedPromise, useCachedState, usePromise } from "@raycast/utils";
import { spawn } from "child_process";
import path, { basename } from "path";
import { useEffect, useRef, useState } from "react";
import { ensureFdCLI } from "./lib/fd-downloader";
import os from "os";
import fs from "fs";
import afs from "fs/promises";
import { ensureFzfCLI } from "./lib/fzf-downloader";
import readline from "readline";
import Stream from "stream";
import assert from "assert";
import sanitizeFilename from "sanitize-filename";
import { randomInt, randomUUID } from "crypto";

type Prefs = {
  includeDirectories: boolean;
  includeHidden: boolean;
  ignoreSpacesInSearch: boolean;
  followSymlinks: boolean;
  customSearchDirs: string;
};

export default function Command() {
  const abortableFd = useRef<AbortController>(new AbortController());
  const abortableFzf = useRef<AbortController>(new AbortController());
  const prefs = getPreferenceValues<Prefs>();

  const [searchText, setSearchText] = useState("");
  const [searchRoot, setSearchRoot] = useCachedState<string>("searchRootKey", os.homedir());

  // Get FD CLI path
  const { data: fdPath, isLoading: isFdLoading } = useCachedPromise(async () => {
    try {
      return await ensureFdCLI();
    } catch (error) {
      throw new Error(`Couldn't load the fd CLI: ${error}`);
    }
  });

  // Get FZF CLI path
  const { data: fzfPath, isLoading: isFzfCliLoading } = useCachedPromise(async () => {
    try {
      return await ensureFzfCLI();
    } catch (error) {
      throw new Error(`Couldn't load the fzf CLI: ${error}`);
    }
  });

  // cleanup old .temp files (older than 10min)
  // In this extension when user exits during indexing, it will leave
  // temp files behind.
  // The cleanup needs to be done on mount as raycast kills the
  // extensions without calling unmount functions nor sending signals when user exits extension.
  // Issue #2022
  useEffect(() => {
    let canceled = false;
    const CutoffMs = 10 * 60 * 1000;
    const now = Date.now();

    (async () => {
      const allFiles = await afs.readdir(environment.supportPath);
      const tempFiles = allFiles.filter((f) => f.endsWith(".temp"));
      for (const filename of tempFiles) {
        if (canceled) break;

        const filepath = path.join(environment.supportPath, filename);
        const stats = await afs.stat(filepath);

        const birthtimeDiff = now - stats.birthtimeMs;
        if (birthtimeDiff > CutoffMs) {
          console.log(`birthtimeMsDiff: ${birthtimeDiff.toFixed(0)}, removing ${filepath}`);
          await afs.rm(filepath, {
            force: true,
          });
        }
      }
    })();

    return () => {
      canceled = true;
    };
  }, []);

  // Get fdOutput filepath
  const { data: fdOutput, isLoading: isFdOutputLoading } = useCachedPromise(
    async (searchRoot?: string, fdPath?: string) => {
      assert(searchRoot !== undefined);
      assert(fdPath !== undefined);

      const ignoreFile = path.join(os.homedir(), ".config", "fd", "ignore");
      if (!fs.existsSync(ignoreFile)) {
        console.log(`creating default .fdignore file in: ${ignoreFile}`);
        // Create directories
        afs.mkdir(path.dirname(ignoreFile), { recursive: true });
        const ignorePaths = [
          "/nix/",
          "/System/",
          "/Library/",
          "/private/",
          "/usr/",
          path.join(os.homedir(), "Library/*"),
          path.join(os.homedir(), "!/Library/CloudStorage/"),
          path.join(os.homedir(), "**", "*.photoslibrary/"),
        ];
        await afs.writeFile(ignoreFile, ignorePaths.join("\n"));
      }

      let optionalArgs: string[] = [];
      if (!prefs.includeDirectories) {
        optionalArgs = [...optionalArgs, "--type", "file"];
      }
      if (prefs.includeHidden) {
        optionalArgs = [...optionalArgs, "--hidden"];
      }
      if (prefs.followSymlinks) {
        optionalArgs = [...optionalArgs, "--follow"];
      }

      const searchDirs = searchRoot.split(" ");

      // Final file fzf is reading from
      const fdOutput = path.join(environment.supportPath, `fd-out-${sanitizeFilename(searchRoot)}.txt`);
      // File to write to during the indexing
      const fdOutputTemp = `${fdOutput}.${Date.now()}${randomInt(10000)}.temp`;

      const toast = await showToast({
        title: "Indexing",
        style: Toast.Style.Animated,
      });
      if (fs.existsSync(fdOutput)) {
        toast.message = "updating index of files using fd";
      } else {
        toast.message = "creating index of files using fd";
      }

      const outFD = fs.openSync(fdOutputTemp, "wx");
      try {
        const fd = spawn(fdPath, [...optionalArgs, "--print0", ".", ...searchDirs], {
          stdio: ["ignore", outFD, "pipe"],
          signal: abortableFd.current?.signal,
        });

        await new Promise<void>((resolve, reject) => {
          let stderr = "";
          fd.stderr?.on("data", (chunk) => {
            stderr += chunk;
          });

          fd.on("error", () => {
            console.log("aborting fd");
            fs.rmSync(fdOutputTemp, { force: true });
            reject("'fd' aborted");
          });

          fd.on("close", (code) => {
            if (code === 0) {
              resolve();
            } else {
              console.log("closing fd with code", code);
              fs.rmSync(fdOutputTemp, { force: true });
              reject(`Exit code of 'fd' = ${code}:\n${stderr}`);
            }
          });
        });
      } finally {
        fs.closeSync(outFD);
      }

      toast.hide();

      console.log(`renaming ${basename(fdOutputTemp)} -> ${basename(fdOutput)}`);
      await afs.rename(fdOutputTemp, fdOutput);
      console.log(`finished renaming ${basename(fdOutputTemp)} -> ${basename(fdOutput)}`);
      return { filepath: fdOutput, randomUUID: randomUUID() };
    },
    [searchRoot, fdPath],
    {
      execute: searchRoot !== undefined && fdPath !== undefined,
      abortable: abortableFd,
      keepPreviousData: true,
    },
  );

  // Get filteredPaths from fzf output
  const { data: filteredPaths, isLoading: isFilteredPathsLoading } = usePromise(
    async (searchText: string, fzfPath?: string, fdOutput?: string, _?: string) => {
      assert(fzfPath !== undefined);
      assert(fdOutput !== undefined);
      assert(_ !== undefined); // required by linter

      // sanitize input
      let searchTerm = searchText;
      if (prefs.ignoreSpacesInSearch) {
        searchTerm = searchTerm.replaceAll(" ", "");
      }
      searchTerm = searchTerm.replaceAll("~", os.homedir());

      const filteredResults: string[] = [];
      const fdOutputFD = fs.openSync(fdOutput, "r");
      try {
        const fzf = spawn(fzfPath, ["--read0", "--filter", searchTerm], {
          stdio: [fdOutputFD, "pipe", "pipe"],
          signal: abortableFzf.current?.signal,
        });
        await new Promise<void>((resolve, reject) => {
          const rl = readline.createInterface({ input: fzf.stdout as Stream.Readable });
          rl.on("line", (line) => {
            // Limit results, as otherwise they will exceed memory limits,
            // raycast will terminate the extension. Issue #21580
            if (filteredResults.length >= 1000) {
              // It sends the kill signal when reaching 1000,
              // so results will be larger than 1000
              fzf.kill();
            } else {
              filteredResults.push(line);
            }
          });

          let stderr = "";
          fzf.stderr?.on("data", (chunk) => {
            stderr += chunk;
          });

          fzf.on("error", () => {
            console.log("aborting fzf");
          });

          fzf.on("close", (code) => {
            rl.close();
            // Fzf returns error code 1 if output is empty
            if (code === 0 || code === null || (code === 1 && stderr.length === 0)) {
              resolve();
            } else {
              reject(`Exit code of 'fzf' = ${code}:\n${stderr}`);
            }
          });
        });
      } finally {
        fs.closeSync(fdOutputFD);
      }
      console.log(`fzf returned ${filteredResults.length} results`);
      return filteredResults;
    },
    // randomUUID is used to trigger fzf on updated index list from fd
    [searchText, fzfPath, fdOutput?.filepath, fdOutput?.randomUUID],
    {
      execute: fzfPath !== undefined && fdOutput !== undefined,
      abortable: abortableFzf,
    },
  );

  return (
    <List
      navigationTitle="Search Files"
      isLoading={isFdLoading || isFdOutputLoading || isFzfCliLoading || isFilteredPathsLoading}
      searchBarPlaceholder={"Search for your files"}
      onSearchTextChange={setSearchText}
      filtering={false} // disable builtin filtering as we use a custom one
      searchBarAccessory={
        <List.Dropdown tooltip="Search" value={searchRoot} onChange={setSearchRoot}>
          <List.Dropdown.Item title="Home (~)" value={os.homedir()} />
          <List.Dropdown.Item title="Everything (/)" value={"/"} />
          <List.Dropdown.Item title={`Custom Directories`} value={prefs.customSearchDirs} />
        </List.Dropdown>
      }
    >
      {filteredPaths?.map((filepath) => {
        const filename = basename(filepath);
        return (
          <List.Item
            key={filepath}
            title={filepath.startsWith(os.homedir()) ? filepath.replace(os.homedir(), "~") : filepath}
            subtitle={filename}
            quickLook={{ path: filepath, name: filename }}
            actions={
              <ActionPanel>
                <Action.Open title="Open" target={filepath} />
                <Action.ShowInFinder title="Show in Finder" path={filepath} />
                <Action.CopyToClipboard
                  title="Copy Path to Clipboard"
                  content={filepath}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.ToggleQuickLook shortcut={{ modifiers: ["cmd"], key: "y" }} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
