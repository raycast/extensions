import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
  getDefaultSearchFormatPreference,
  getFetchAllPagePreference,
  nexus,
  replaceMavenVersionTimestampWithSnapshot,
} from "./common";
import uniq from "lodash.uniq";
import { convertApiException, NexusComponent } from "./api";

export default function SearchComponentsCommand() {
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<NexusComponent[]>([]);
  const [format, setFormat] = useState<"all" | string>(getDefaultSearchFormatPreference());
  const [loadingFormats, setLoadingFormats] = useState<boolean>(false);
  const [nexusFormats, setNexusFormats] = useState<string[]>([getDefaultSearchFormatPreference()]);
  const [error, setError] = useState<Error>();

  const loadData = useMemo(() => {
    return async (q: string) => {
      if (!q) {
        return;
      }
      setLoading(true);
      try {
        const params = {
          q: `*${q}*`,
          sort: "version",
          direction: "desc",
          ...(format !== "all" ? { format } : {}),
        };
        const components = getFetchAllPagePreference()
          ? await nexus.searchAllComponents(params)
          : (await nexus.searchComponents(params)).items;
        setData(replaceMavenVersionTimestampWithSnapshot(components));
      } catch (e) {
        setError(convertApiException("Fail to load components", e));
      } finally {
        setLoading(false);
      }
    };
  }, [format, setLoading, setData]);

  useEffect(() => {
    searchText && loadData(searchText);
  }, [searchText, loadData]);

  useEffect(() => {
    (async () => {
      try {
        setLoadingFormats(true);
        const nexusRepositories = await nexus.getRepositories();
        setNexusFormats(["all", ...uniq(nexusRepositories.map(({ format }) => format)).sort()]);
      } catch (e) {
        setError(convertApiException("Fail to load component formats", e));
      } finally {
        setLoadingFormats(false);
      }
    })();
  }, [setLoadingFormats, setNexusFormats]);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: error.name,
        message: error.message,
      });
    }
  }, [error]);

  return (
    <List
      isLoading={loading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search nexus components..."
      throttle
      searchBarAccessory={
        <List.Dropdown isLoading={loadingFormats} value={format} onChange={setFormat} tooltip="Select Format">
          {nexusFormats.map((format: string) => (
            <List.Dropdown.Item key={format} value={format} title={format} />
          ))}
          <List.Dropdown.Section></List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.Section title="Results" subtitle={data?.length + ""}>
        {data?.map((searchResult) => (
          <SearchListItem key={searchResult.id} component={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ component }: { component: NexusComponent }) {
  const icon = useMemo(() => {
    switch (component.format) {
      case "maven2":
        return "java.png";
      case "pypi":
        return "python.png";
      case "npm":
        return "npm.png";
      case "docker":
        return "docker.png";
      case "rubygems":
        return "rubygems";
      default:
        return undefined;
    }
  }, [component.format]);

  const title = useMemo(() => {
    switch (component.format) {
      case "maven2":
        return `${component.group}:${component.name}`;
      default:
        return component.name;
    }
  }, [component]);

  const copyAction = useMemo(() => {
    switch (component.format) {
      case "maven2":
        return (
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Maven Dependency"
              content={`<dependency>\n    <groupId>${component.group}</groupId>\n    <artifactId>${component.name}</artifactId>\n    <version>${component.version}</version>\n</dependency>`}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
        );
      case "pypi":
        return (
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Pip Install Command"
              content={`pip install ${component.name}==${component.version}`}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
        );
      case "npm":
        return (
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Npm Install Command"
              content={`npm install ${component.name}@${component.version}`}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
        );
      case "docker":
        return (
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Docker Pull Command"
              content={`docker pull ${component.name}:${component.version}`}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
        );
      case "rubygems":
        return (
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Gem Install Command"
              content={`gem install ${component.name} -v ${component.version}`}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
        );
      default:
        return undefined;
    }
  }, [component]);

  return (
    <List.Item
      icon={icon}
      title={title}
      accessories={[{ text: component.version }]}
      actions={
        <ActionPanel>
          {copyAction}
          <ActionPanel.Section>
            <Action.OpenInBrowser
              url={nexus.getComponentWebUrl(component)}
              shortcut={{ modifiers: ["cmd"], key: "enter" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
