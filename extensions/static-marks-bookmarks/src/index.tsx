import { ActionPanel, Action, List, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import YAML from "yaml";

export default function Command() {
  const { data, isLoading } = useFetch(getPreferenceValues()["static-mark-yaml-url"], {
    parseResponse: parseFetchYamlResponse,
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search bookmarks...">
      <List.Section title="Results" subtitle={data?.length + ""}>
        {data?.map((searchResult, index) => (
          <SearchListItem key={index} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: LinkResult }) {
  return (
    <List.Item
      title={searchResult.name}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={searchResult.url} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function parseFetchYamlResponse(response: Response) {
  const json = YAML.parse(await response.text());

  const linkResults = flattenYaml(json, [], "");

  if (!response.ok || "message" in json) {
    throw new Error("message" in json ? json.message : response.statusText);
  }

  return linkResults;
}

function flattenYaml(json: unknown[], linkResults: LinkResult[], parentKey: string): LinkResult[] {
  for (const [key, value] of Object.entries(json)) {
    if (typeof value === "string") {
      let descParent = "";
      if (parentKey.length > 0) {
        descParent = parentKey + " > ";
      }
      if (key.length > 1 && value.startsWith("http")) {
        linkResults.push({
          name: descParent + key,
          description: descParent + key,
          url: value,
        });
      } else if (value.startsWith("http")) {
        linkResults.push({
          name: descParent,
          description: descParent + key,
          url: value,
        });
      }
    } else {
      // Skip virtual parents (0, 1, 2 etc..)
      let nextParentKeyChain = parentKey;
      if (key.length > 1 && parentKey.length > 0) {
        nextParentKeyChain = parentKey + " > " + key;
      } else if (key.length > 1) {
        nextParentKeyChain = key;
      }
      flattenYaml(value as unknown[], linkResults, nextParentKeyChain);
    }
  }
  return linkResults;
}

interface LinkResult {
  name: string;
  description: string;
  url: string;
}
