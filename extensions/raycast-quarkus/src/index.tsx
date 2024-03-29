/* eslint-disable @typescript-eslint/no-explicit-any */
import { ActionPanel, open, List, Action, Icon, LocalStorage, Toast, showToast, Clipboard } from "@raycast/api";

import { useEffect, useState } from "react";
import { useFetch } from "@raycast/utils";
import fetch from "node-fetch";
import { writeFile, access } from "fs/promises";
import decompress from "decompress";

import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  directory: string;
  platform: string;
  buildTool: string;
  groupId: string;
  version: string;
  unzip: boolean;
}

const host = "https://code.quarkus.io";

const removeDuplicatesIds = (result: any) => {
  const ids = new Set<string>(result?.map((i: any) => i.id));
  const data: any[] = [];
  for (const id of ids) {
    const item = result.find((i: { id: string }) => i.id === id);
    if (item) {
      data.push(item);
    }
  }
  // Sort data by name

  return {
    data: {
      items: data,
    },
  };
};

const generateUrl = (host: string, path: string, queries: { [key: string]: string }, extensions: any) => {
  let url = `${host}${path}`;
  const sortedQueries = {};
  if (queries) {
    // Sort the queries
    const sortedQueries: { [key: string]: string } = {};
    Object.keys(queries)
      .sort()
      .forEach(function (key) {
        sortedQueries[key] = queries[key];
      });
  }
  if (queries) {
    url += "?";
    for (const key in sortedQueries) {
      // key is first letter of the query
      let qk = key[0].toLowerCase();
      qk = qk === "p" ? "S" : qk;
      url += `${qk}=${queries[key]}&`;
    }
  }
  if (extensions) {
    for (const ext of extensions) {
      url += `e=${ext}&`;
    }
  }

  // Remove the last '&' from the url
  url = url.slice(0, -1);

  return url;
};

const getDependcyString = (extensionId: string) => {
  return `<dependency>
    <groupId>${extensionId.split(":")[0]}</groupId>
    <artifactId>${extensionId.split(":")[1]}</artifactId>
</dependency>`;
};

export default function Command(props: any) {
  const preferences = getPreferenceValues<Preferences>();
  const [selectedExtensionIds, setSelectedExtensionIds] = useState<string[]>([]);
  const [selectedExtensions, setSelectedExtensions] = useState<object[] | null>([]);
  const [data, setData] = useState<string | null>(null);
  const { isLoading, data: extensionList } = useFetch(host + "/api/extensions", { mapResult: removeDuplicatesIds });

  const downloadProject = async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Downloading... " });
    let { artifactId } = props.arguments;
    const { directory, platform, buildTool, groupId, version, unzip } = preferences;
    const query = { platform, buildTool, groupId, version };
    let exists = false;
    if (!artifactId) {
      artifactId = "code-with-quarkus";
    }
    const path = `${directory}/${artifactId}`;
    try {
      await access(path);
      exists = true;
    } catch (error) {
      // Do nothing if directory does not exist
    }
    if (exists) {
      toast.style = Toast.Style.Failure;
      toast.title = `Project "${artifactId}" already exists in the directory!`;
    } else {
      toast.title = "Starting Download...";
      const ids = selectedExtensionIds.map((id) => id.split(":")[1]);
      const url = generateUrl(host, "/api/download", { ...query, artifactId }, ids);
      // fetch zip file to download
      try {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        // Save zip file to disk
        const uint8Array = new Uint8Array(buffer);
        const filePath = `${path}.zip`;
        await writeFile(filePath, uint8Array);
        toast.style = Toast.Style.Success;
        toast.title = "Downloaded";
        toast.message = `Project downloaded to ${filePath}`;
        if (!unzip) {
          return;
        }
        await decompress(filePath, directory);
        // await trash(filePath);
        await Clipboard.copy(path);
      } catch (error) {
        console.error(error);
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to Download Project";
        toast.message = (error as Error).message;
      }
    }
  };

  const saveExtensions = async () => {
    const options: Toast.Options = {
      style: Toast.Style.Success,
      title: "Extenstions Saved",
      message: "Selected extensions have been saved.",
    };
    await LocalStorage.setItem("selectedExtensions", JSON.stringify(selectedExtensions));
    await showToast(options);
  };

  const showExtensionGuide = async (url: string) => {
    console.log(url);
    await open(url);
  };

  const copyDependency = async (extensionId: string) => {
    await Clipboard.copy(getDependcyString(extensionId));

    await showToast({ style: Toast.Style.Success, title: "Copied pom.xml dependency to Clipboard" });
  };

  const clearSavedExtensions = async () => {
    await LocalStorage.removeItem("selectedExtensions");
    setSelectedExtensionIds([]);
    setSelectedExtensions([]);
    await showToast({ style: Toast.Style.Success, title: "Saved Extensions Cleared" });
  };

  useEffect(() => {
    if (extensionList) {
      setSelectedExtensions(
        selectedExtensionIds.map((id) => (extensionList.items as Array<any>).find((extension) => extension.id === id)),
      );
    }
  }, [selectedExtensionIds]);

  useEffect(() => {
    const getSavedExtensions = async () => {
      const savedExtensions: any = await LocalStorage.getItem("selectedExtensions");
      if (selectedExtensions) {
        const parsedExtensions = JSON.parse(savedExtensions || "[]");
        setSelectedExtensions(parsedExtensions);
        setSelectedExtensionIds(parsedExtensions.map((ext: any) => ext.id));
      }
    };
    getSavedExtensions();
  }, []);

  return (
    <>
      <List isLoading={isLoading} isShowingDetail onSelectionChange={setData}>
        <List.Section title={`Selected Quarkus Extensions (${selectedExtensions?.length}) `}>
          {selectedExtensions?.map((extension: any) => (
            <List.Item
              key={extension?.id as string}
              icon={Icon.Checkmark}
              title={extension?.name}
              detail={<ExtensionDetail extension={extension} />}
              actions={
                <ActionPanel>
                  <Action
                    title="Remove"
                    onAction={() => {
                      setSelectedExtensionIds((s) => s.filter((x) => x !== extension?.id));
                    }}
                  />
                  <Action title="Copy Dependency" onAction={() => copyDependency(extension?.id)} />
                  <Action
                    title="Download Project"
                    onAction={downloadProject}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                  <Action
                    title="See Extension Guide"
                    onAction={() => showExtensionGuide(extension?.guide)}
                    shortcut={{ modifiers: ["cmd"], key: "g" }}
                  />
                  <Action
                    title="Save Selected Extensions"
                    onAction={saveExtensions}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>

        <List.Section title="Quarkus Extensions">
          {((extensionList?.items as Array<any>) || [])?.map((extension) => (
            <List.Item
              key={extension?.id}
              id={extension?.id}
              icon="list-icon.png"
              title={extension?.name}
              detail={<ExtensionDetail extension={extension} />}
              actions={
                <ActionPanel>
                  <Action
                    title="Select"
                    onAction={() => {
                      setSelectedExtensionIds((s) => (!s.includes(data || "") ? [...s, data || ""] : s));
                    }}
                  />
                  <Action title="Copy Dependency" onAction={() => copyDependency(extension?.id)} />
                  <Action
                    title="Download Project"
                    onAction={downloadProject}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                  <Action
                    title="See Extension Guide"
                    onAction={() => showExtensionGuide(extension?.guide)}
                    shortcut={{ modifiers: ["cmd"], key: "g" }}
                  />
                  <Action title="Clear Saved Extensions" onAction={clearSavedExtensions} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      </List>
    </>
  );
}

const ExtensionDetail: React.FC<{ extension: any }> = ({ extension }) => {
  return (
    <List.Item.Detail
      markdown={`
## ${extension?.name}  \n
> _${extension?.id}:${extension?.version}_ \n\n
${extension?.description} \n

\`\`\`xml
${getDependcyString(extension?.id)}
\`\`\`


`}
    />
  );
};
