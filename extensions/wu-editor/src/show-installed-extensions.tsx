import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "smol-toml";
import { extensionsDir } from "./wu";

type InstalledExtension = {
  id: string;
  name: string;
  version: string;
  description: string;
  repository: string;
  path: string;
};

export default function Command() {
  const { data, isLoading, error } = usePromise(loadInstalledExtensions);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search installed extensions">
      <List.EmptyView
        icon={Icon.Plug}
        title={error ? "Could not read Wu's extensions" : "No extensions installed"}
        description={error ? error.message : "Extensions you install in Wu will show up here."}
      />
      {(data ?? []).map((extension) => (
        <List.Item
          key={extension.id}
          icon={Icon.Plug}
          title={extension.name}
          subtitle={extension.description}
          keywords={[extension.id]}
          accessories={[{ tag: extension.version }]}
          actions={
            <ActionPanel>
              {extension.repository ? (
                <Action.OpenInBrowser title="Open Repository" url={extension.repository} />
              ) : null}
              <Action.ShowInFinder path={extension.path} />
              <Action.CopyToClipboard title="Copy Extension ID" content={extension.id} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

async function loadInstalledExtensions(): Promise<InstalledExtension[]> {
  const root = extensionsDir();
  const entries = await readdir(root, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  });
  const extensions = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const path = join(root, entry.name);
        const manifest = await readFile(join(path, "extension.toml"), "utf8").catch(() => "");
        const fields = stringFields(manifest);
        return {
          id: fields.id ?? entry.name,
          name: fields.name ?? entry.name,
          version: fields.version ?? "",
          description: fields.description ?? "",
          repository: fields.repository ?? "",
          path,
        };
      }),
  );
  return extensions.sort((left, right) => left.name.localeCompare(right.name));
}

function stringFields(toml: string): Record<string, string> {
  let parsed: Record<string, unknown>;
  try {
    parsed = parse(toml);
  } catch {
    return {};
  }
  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === "string") {
      fields[key] = value;
    }
  }
  return fields;
}
