import fs from "fs";
import os from "os";
import path from "path";

import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";

import { git } from "./git";

const relagitDir = path.join(os.homedir(), ".relagit");
const settingsJson = path.join(relagitDir, "settings.json");
const repositoriesJson = path.join(relagitDir, "repositories.json");
const externalJson = path.join(relagitDir, "external.json");
const workflows = path.join(relagitDir, "workflows");

export type Settings = {
  externalEditor: "code" | "code-insiders" | "atom" | "subl" | "fleet" | "zed";
  activeRepository: string | null;
};

export const getSettings = (): Partial<Settings> => {
  try {
    return JSON.parse(fs.readFileSync(settingsJson, "utf-8"));
  } catch {
    return {};
  }
};

type SettingsKey = keyof Settings;

export const setSetting = async <T extends SettingsKey>(key: T, value: Settings[T]) => {
  try {
    const settings = getSettings();
    const parts = key.split(".");

    let current: string | object = settings;

    for (const part of parts.slice(0, -1)) {
      if (!(current as Record<string, object>)[part]) {
        (current as Record<string, object>)[part] = {};
      }

      current = (current as Record<string, object>)[part];
    }

    (current as Record<string, unknown>)[parts[parts.length - 1]] = value;

    fs.writeFileSync(settingsJson, JSON.stringify(settings, null, 4));
  } catch (error) {
    showFailureToast(error, { title: "Failed to save settings" });
  }
};

type Repository = {
  path: string;
  safePath: string;
  name: string;
  ahead?: number;
  behind?: number;
  remote?: string;
};

export const useRepositories = (): Repository[] | undefined => {
  const [repos, setRepos] = useState<Repository[]>();

  useEffect(() => {
    const run = async () => {
      try {
        const repos = JSON.parse(fs.readFileSync(repositoriesJson, "utf-8"));

        const out: Repository[] = [];

        for (const repo of repos) {
          const safePath = repo.replace(os.homedir(), "~");

          let ahead = 0;
          let behind = 0;
          let remote = "";

          try {
            const status = await git("status", ["-sb"], repo);

            ahead = Number(status.match(/ahead (\d+)/)?.[1] || 0);
            behind = Number(status.match(/behind (\d+)/)?.[1] || 0);

            remote = (await git("remote", ["get-url", "origin"], repo)).trim();
          } catch (e) {
            // noop, ignore errors
          }

          out.push({
            path: repo,
            safePath,
            name: path.basename(repo),
            ahead,
            behind,
            remote,
          });
        }

        return out;
      } catch {
        return repos || [];
      }
    };

    run().then(setRepos);
  }, []);

  return repos;
};

export const useSettings = (): Partial<Settings> => {
  const [settings, setSettings] = useState(getSettings());

  useEffect(() => {
    if (fs.existsSync(settingsJson)) {
      const watcher = fs.watch(settingsJson, () => {
        setSettings(getSettings());
      });

      return () => {
        watcher.close();
      };
    }
  }, []);

  return settings;
};

export type Workflow = {
  name: string;
  description: string;
  content: string;
  path: string;
  pluginPath: string;
  nativePath?: string;
};

const getMetadata = (path: string) => {
  const content = fs.readFileSync(path, "utf-8");

  const name = content.match(/name:\s?('|"|`)(.+)\1/)?.[2] || path;
  const description = content.match(/description:\s?('|"|`)(.+)\1/)?.[2] || "";

  return {
    name,
    description,
  };
};

const getWorkflows = async (): Promise<{
  relagit: Workflow[];
  external: Workflow[];
}> => {
  const relagitOut: Workflow[] = [];
  const externalOut: Workflow[] = [];

  try {
    let files = fs.readdirSync(workflows);
    const external = JSON.parse(fs.readFileSync(externalJson, "utf-8"));

    for (const file of files) {
      if (!["js", "ts", "mjs", "mts", "cjs", "cts"].includes(file.split(".").pop()!)) {
        continue;
      }

      const _path = path.join(workflows, file);
      let nativePath: string | undefined = path.join(workflows, file.replace(/\.([a-z]+)$/, ".native.$1"));

      if (!fs.existsSync(nativePath)) {
        nativePath = undefined;
      } else {
        files = files.filter((f) => f !== file.replace(/\.([a-z]+)$/, ".native.$1"));
      }

      const metadata = getMetadata(_path);

      relagitOut.push({
        name: metadata.name,
        description: metadata.description,
        content: fs.readFileSync(_path, "utf-8"),
        path: _path,
        pluginPath: _path?.replace(os.homedir(), "~"),
        nativePath: nativePath?.replace(os.homedir(), "~"),
      });
    }

    for (const p of external) {
      try {
        const dir = fs.opendirSync(p);

        dir.close();
      } catch {
        continue;
      }

      const relagitPath = path.join(p, "relagit.json");

      if (!fs.existsSync(relagitPath)) {
        continue;
      }

      const relagit = JSON.parse(fs.readFileSync(relagitPath, "utf-8")) as {
        plugin: string;
        native?: string;
      };

      const metadata = getMetadata(path.join(p, relagit.plugin));

      externalOut.push({
        name: metadata.name,
        description: metadata.description,
        content: fs.readFileSync(path.join(p, relagit.plugin), "utf-8"),
        path: p?.replace(os.homedir(), "~"),
        pluginPath: path.join(p, relagit.plugin).replace(os.homedir(), "~"),
        nativePath: relagit.native ? path.join(p, relagit.native).replace(os.homedir(), "~") : undefined,
      });
    }
  } catch (error) {
    showFailureToast(error, { title: "Failed to load workflows" });
  }

  return {
    relagit: relagitOut,
    external: externalOut,
  };
};

export const useWorkflows = ():
  | {
      relagit: Workflow[];
      external: Workflow[];
    }
  | undefined => {
  const [workflows, setWorkflows] = useState<{
    relagit: Workflow[];
    external: Workflow[];
  }>();

  useEffect(() => {
    getWorkflows().then(setWorkflows);
  }, []);

  return workflows;
};
