import { ActionPanel, Detail, List, Action, Icon, Color } from "@raycast/api";
import { usePromise, showFailureToast } from "@raycast/utils";
import { useState } from "react";

// Stole most of this code
//   https://github.com/raycast/extensions/tree/main/extensions/installed-extensions/src

export type ExtensionMetadata = {
  path: string;
  name: string;
  icon: string;
  iconPath: string;
  title: string;
  author: string;
  owner?: string; // only exists for organizations
  access?: string; // only exists for organizations
  commandCount: number;
  created: Date;
  isLocalExtension: boolean;
  link: string;
  raw: string;
  json: object;
  commands: {
    title: string;
    name: string;
    arguments: {
      required: boolean;
      name: string;
      placeholder: string;
      description: string;
    }[];
  }[];
};

import fs from "fs/promises";
import os from "os";
import path from "path";

async function getPackageJsonFiles() {
  try {
    const extensionsDir = path.join(os.homedir(), ".config", "raycast", "extensions");
    const extensions = await fs.readdir(extensionsDir);
    const packageJsonFiles = await Promise.all(
      extensions.map(async (extension) => {
        const packageJsonPath = path.join(extensionsDir, extension, "package.json");
        try {
          await fs.access(packageJsonPath, fs.constants.F_OK);
          return packageJsonPath;
        } catch (e) {
          return null;
        }
      }),
    );
    return packageJsonFiles.filter((file) => file !== null) as string[];
  } catch (e) {
    if (e instanceof Error) {
      showFailureToast(e.message);
      throw new Error(e.message);
    }
    throw new Error("An unknown error occurred");
  }
}

export function useExtensions() {
  const [installedExtensions, setInstalledExtensions] = useState<ExtensionMetadata[]>([]);

  const { isLoading } = usePromise(async () => {
    const files = await getPackageJsonFiles();
    let result = await Promise.all(
      files.map(async (file) => {
        const content = await fs.readFile(file, "utf-8");
        const stats = await fs.stat(file);
        const json = JSON.parse(content);

        const author: string = json.author;
        const owner: string | undefined = json?.owner;
        const access: string | undefined = json?.access;
        const name: string = json.name;
        const link = `https://raycast.com/${owner ?? author}/${name}`;
        const cleanedPath = file.replace("/package.json", "");

        return {
          path: cleanedPath,
          name,
          author: author,
          icon: json.icon,
          iconPath: cleanedPath + "/assets/" + json.icon,
          commandCount: json.commands.length,
          owner,
          access,
          title: json.title,
          link,
          created: stats.ctime,
          isLocalExtension: !cleanedPath.match(/[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}/gi),
          raw: content,
          commands: json.commands,
          json,
        };
      }),
    );

    result = result.filter((item) => item.title !== "" && item.author !== "");
    result = result.sort((a, b) => a.title.localeCompare(b.title));

    setInstalledExtensions(result);

    return result;
  });

  return { isLoading, installedExtensions };
}

export default function SearchManifestsCommand() {
  const { isLoading, installedExtensions } = useExtensions();

  return (
    <List isLoading={isLoading} isShowingDetail={false}>
      {installedExtensions.map((extension) => (
        <List.Item
          icon={extension.path + "/assets/" + extension.icon}
          title={extension.title}
          subtitle={extension.author}
          accessories={[{ tag: { value: extension.commandCount.toString(), color: Color.Blue }, icon: Icon.Play }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Commands"
                target={
                  <List>
                    {extension.commands.map((command) => (
                      <List.Item
                        title={command.title}
                        subtitle={command.description}
                        accessories={[
                          ...(command.arguments
                            ? [{ tag: { value: command.arguments?.length.toString() }, icon: Icon.SpeechBubble }]
                            : []),
                          { tag: { value: command.name }, icon: Icon.BarCode },
                        ]}
                        actions={
                          <ActionPanel>
                            <Action.Push
                              title="Show Commands"
                              target={
                                <Detail markdown={"``` \n" + JSON.stringify(command, undefined, 4) + " \n ```"} />
                              }
                            />
                          </ActionPanel>
                        }
                      />
                    ))}
                  </List>
                }
              />
              <Action.Push title="Show Manifest" target={<Detail markdown={"``` \n" + extension.raw + " \n ```"} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
