import { useEffect, useMemo, useState } from "react";
import { List, ActionPanel, Action, showToast, ToastStyle } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import yaml from "js-yaml";

interface UserStyleDetails {
  name: string | string[];
  categories?: string[];
  icon?: string;
  color?: string;
  readme?: {
    "app-link"?: string | string[];
    usage?: string;
  };
  currentMaintainers?: string[];
  pastMaintainers?: string[];
}

interface UserStylesYaml {
  userstyles: Record<string, UserStyleDetails>;
}

export default function SearchUserStyles() {
  const { isLoading, data, revalidate } = useFetch(
    "https://raw.githubusercontent.com/catppuccin/userstyles/main/scripts/userstyles.yml"
  );
  const [searchText, setSearchText] = useState<string>("");

  const userStyles = useMemo(() => {
    if (!data) return {};

    try {
      const parsedData = yaml.load(data) as UserStylesYaml;
      return parsedData.userstyles || {};
    } catch (error) {
      showToast(ToastStyle.Failure, "Failed to parse YAML", String(error));
      return {};
    }
  }, [data]);

  const filteredUserStyles = useMemo(() => {
    return Object.entries(userStyles).filter(([_, userStyleDetails]) => {
      const styleName = Array.isArray(userStyleDetails.name)
        ? userStyleDetails.name.join(" ")
        : userStyleDetails.name;
      return (
        styleName.toLowerCase().includes(searchText.toLowerCase()) ||
        _.toLowerCase().includes(searchText.toLowerCase())
      );
    });
  }, [userStyles, searchText]);

  const getAppLink = (appLink?: string | string[]) => {
    return Array.isArray(appLink) ? appLink[0] : appLink || "No app link provided";
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search user styles..."
      onSearchTextChange={setSearchText}
      actions={
        <ActionPanel>
          <Action title="Reload" onAction={() => revalidate()} />
        </ActionPanel>
      }
    >
      {filteredUserStyles.map(([styleKey, userStyleDetails]) => {
        const githubLink = `https://github.com/catppuccin/userstyles/tree/main/styles/${styleKey}`;
        const appLink = getAppLink(userStyleDetails.readme?.["app-link"]);

        return (
          <List.Item
            key={styleKey}
            title={Array.isArray(userStyleDetails.name) ? userStyleDetails.name.join(" / ") : userStyleDetails.name}
            subtitle={`Categories: ${userStyleDetails.categories?.join(", ") || "None"}`}
            accessories={[{ text: appLink }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={githubLink} title="Open GitHub" />
                {appLink && <Action.OpenInBrowser url={appLink} title="Open App Link" />}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}