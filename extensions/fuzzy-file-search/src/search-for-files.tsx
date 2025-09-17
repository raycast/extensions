import { ActionPanel, List, Action, getPreferenceValues, environment } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { spawn } from "child_process";
import path, { basename } from "path";
import { useRef, useState } from "react";
import { ensureFdCLI } from "./lib/fd-downloader";
import os from "os";
import fs from "fs";
import { ensureFzfCLI } from "./lib/fzf-downloader";
import readline from "readline";
import Stream from "stream";
import assert from "assert";
import sanitizeFilename from "sanitize-filename";

type Prefs = {
  includeDirectories: boolean;
  ignoreSpacesInSearch: boolean;
  customSearchDirs: string;
};

export default function Command() {
  const abortableFd = useRef<AbortController>(null);
  const abortableFzf = useRef<AbortController>(null);
  const prefs = getPreferenceValues<Prefs>();

  const [searchText, setSearchText] = useState("");
  const [searchRoot, setSearchRoot] = useState<string>(os.homedir());

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

  // Get fdOutput filepath
  const { data: fdOutput, isLoading: isFdOutputLoading } = usePromise(
    async (searchRoot: string, fdPath: string | undefined) => {
      assert(fdPath !== undefined);

      let optionalArgs = ["--type", "file"];
      if (prefs.includeDirectories) {
        optionalArgs = [];
      }

      const searchDirs = searchRoot.split(" ");

      const fdOutput = path.join(environment.supportPath, `fd-out-${sanitizeFilename(searchRoot)}.txt`);
      const outFD = fs.openSync(fdOutput, "w");
      const fd = spawn(fdPath, [...optionalArgs, "--print0", "--follow", ".", ...searchDirs], {
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
        });

        // this is executed both on finish and after on error
        fd.on("close", (code) => {
          fs.closeSync(outFD);
          if (code === 0 || code === null) {
            resolve();
          } else {
            console.log("closing with code", code);
            fs.rmSync(fdOutput, { force: true });
            reject(`Exit code of 'fd' = ${code}:\n${stderr}`);
          }
        });
      });

      return fdOutput;
    },
    [searchRoot, fdPath],
    {
      execute: fdPath !== undefined,
      abortable: abortableFd,
    },
  );

  // Get filteredPaths from fzf output
  const { data: filteredPaths, isLoading: isFilteredPathsLoading } = usePromise(
    async (searchText: string, fzfPath: string | undefined, fdOutput: string | undefined) => {
      assert(fzfPath !== undefined);
      assert(fdOutput !== undefined);

      // sanitize input
      let searchTerm = searchText;
      if (prefs.ignoreSpacesInSearch) {
        searchTerm = searchTerm.replaceAll(" ", "");
      }

      const filteredResults: string[] = [];
      const fdOutputFD = fs.openSync(fdOutput, "r");
      const fd = spawn(fzfPath, ["--read0", "--filter", searchTerm], {
        stdio: [fdOutputFD, "pipe", "pipe"],
        signal: abortableFzf.current?.signal,
      });
      await new Promise<void>((resolve, reject) => {
        const rl = readline.createInterface({ input: fd.stdout as Stream.Readable });
        rl.on("line", (line) => {
          filteredResults.push(line);
          if (filteredResults.length <= 1000) {
            fd.kill();
          }
        });
        let stderr = "";
        fd.stderr?.on("data", (chunk) => {
          stderr += chunk;
        });
        fd.on("error", () => {
          console.log("aborting fzf");
        });
        fd.on("close", (code) => {
          rl.close();
          fs.closeSync(fdOutputFD);
          // Fzf returns error code 1 if output is empty
          if (code === 0 || code === null || (code === 1 && stderr.length === 0)) {
            resolve();
          } else {
            reject(`Exit code of 'fd' = ${code}:\n${stderr}`);
          }
        });
      });
      return filteredResults;
    },
    [searchText, fzfPath, fdOutput],
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
      // throttle // don't re-render on every key-press, adds delay
      searchBarAccessory={
        <List.Dropdown tooltip="Search in directory" value={searchRoot} onChange={setSearchRoot}>
          <List.Dropdown.Item title="Home (~)" value={os.homedir()} />
          <List.Dropdown.Item title="This Computer (/)" value={"/"} />
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
