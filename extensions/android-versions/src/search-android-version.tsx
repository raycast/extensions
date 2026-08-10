import { ActionPanel, List, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import { androidVersions, AndroidVersion } from "./versions";

function VersionDetail(version: AndroidVersion) {
  return (
    <List.Item.Detail
      markdown={`
![Logo](logo/${version.logo})
`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Version" text={"Android " + version.version} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="API Level" text={version.api} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Codename" text={version.codename} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Year" text={version.year} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Link
            title="Document"
            target={version.doc}
            text={`Android ${version.version} ${version.codename}`}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState(androidVersions);

  useEffect(() => {
    const filteredResults = androidVersions.filter((version) => {
      return (
        version.version.includes(searchText) ||
        version.api.includes(searchText) ||
        version.codename.toLowerCase().includes(searchText.toLowerCase())
      );
    });
    setResults(filteredResults);
  }, [searchText]);

  return (
    <List
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter Android version, API level, or codename..."
      isLoading={false}
      isShowingDetail={true}
    >
      {results.map((version, index) => (
        <List.Item
          key={index}
          title={`Android ${version.version}`}
          accessories={[{ text: `API ${version.api}` }]}
          detail={VersionDetail(version)}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Version Info"
                content={`Android ${version.version} (API Level: ${version.api}) - ${version.codename}`}
              />
              <Action.OpenInBrowser url={version.doc} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
