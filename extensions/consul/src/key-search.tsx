import { ActionPanel, Action, Icon, List, LaunchProps, Detail } from "@raycast/api";
import fs from "fs";
import { useState } from "react";
import { usePreferences, KeySearchResult } from "./models";

function SearchDropdown({ onChange }: { onChange: (value: string) => void }) {
  return (
    <List.Dropdown tooltip="Select Region & Env" storeValue={true} onChange={onChange}>
      <List.Dropdown.Section title="Regions">
        <List.Dropdown.Item value="production;op-us-east-1" title="prod-east" />
        <List.Dropdown.Item value="production;op-us-west-2" title="prod-west" />
        <List.Dropdown.Item value="staging;op-us-east-1" title="staging-east" />
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export default function SearchKeyCommand(props: LaunchProps<{ arguments: Arguments.KeySearch }>) {
  const basePath = getBasePath();

  const prefix = "web";
  const pathToSearch = `${basePath}/${prefix}`;

  const keyToSearch = props.arguments.key;
  const [searchResults, setKeysMap] = useState<KeySearchResult[]>();

  const handleDropdownChange = (envAndRegion: string) => {
    const splitted = envAndRegion.split(";");
    const [env, region] = [splitted[0], splitted[1]];
    const updatedKeysMap = getMatchingFiles(pathToSearch, keyToSearch, env, region);
    setKeysMap(updatedKeysMap);
  };

  return (
    <List searchBarAccessory={<SearchDropdown onChange={handleDropdownChange} />} isShowingDetail={true}>
      {searchResults?.map((key) => (
        <List.Item
          key={key.key}
          icon={Icon.Key}
          title={key.key}
          detail={
            <List.Item.Detail
              markdown={getMarkdownContent(key.content)}
              metadata={
                <Detail.Metadata>
                  <Detail.Metadata.Label title="Key" text={key.key} />
                  <Detail.Metadata.Label title="Region" text={key.region} />
                  <Detail.Metadata.Label title="Environment" text={key.environment} />
                </Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={getKeyURL(key)} />
              <Action.OpenWith path={key.fullPathToJSON} />
              <Action.ShowInFinder path={key.fullPathToJSON} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

const CONSUL_URL_TEMPLATE = "http://consul.service.consul:8500/ui/{region}/kv/{prefix}/{environment}/{key}/edit";

function getBasePath() {
  const basePath = usePreferences().consulRepositoryPath;
  if (!basePath) {
    throw new Error("Consul repository path is not set in preferences ⚙️🚨");
  }
  return basePath;
}

function getKeyURL(key: KeySearchResult) {
  return CONSUL_URL_TEMPLATE.replace("{region}", key.region)
    .replace("{prefix}", "web")
    .replace("{environment}", key.environment)
    .replace("{key}", key.key);
}

function getMarkdownContent(content: string): string {
  try {
    return `\`\`\`json\n${JSON.stringify(JSON.parse(content), null, 2)}\n\`\`\``;
  } catch (error) {
    return content;
  }
}

function getMatchingFiles(basePath: string, key: string, env: string, region: string): KeySearchResult[] {
  const results: KeySearchResult[] = [];
  key = key.toLowerCase();
  basePath = basePath + `/${env}`;

  function filterPaths(d: fs.Dirent) {
    const lowerPath = d.path.toLowerCase();
    return d.isFile() && lowerPath.includes(key) && d.name.startsWith(region);
  }

  fs.readdirSync(basePath, { withFileTypes: true, recursive: true })
    .filter(filterPaths)
    .forEach((d) => {
      const relativePath = d.path.replace(`${basePath}/`, "");
      const key = relativePath.replace(`${env}/`, "").replace(d.name, "");
      const fullPathToJSON = `${d.path}/${region}.json`;
      const content = fs.readFileSync(fullPathToJSON, "utf8");

      results.push({
        key: key,
        fullPathToJSON: fullPathToJSON,
        environment: env,
        region: region,
        content: content,
      });
    });

  return results;
}
