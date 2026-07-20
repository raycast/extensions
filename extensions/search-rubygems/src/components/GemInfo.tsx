import { Icon, Detail, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import { useRubyGemsGemDetail } from "../rubygems/useRubyGemsGemDetail";
import type { GemSearchResult, GemDetailResponse, Dependency } from "../rubygems/types";
import { titleize, mapGemLinks } from "../utils";

interface Props {
  gem: GemSearchResult;
}

export const GemInfo = ({ gem }: Props) => {
  const [gemDetails, setGemInfo] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  const mapInfoValues = (gemDetails: GemDetailResponse) => {
    return Object.keys(gemDetails)
      .filter((key) => !key.match(new RegExp(/info|name|uri|dependencies|licenses|metadata/)))
      .sort()
      .map((key) => {
        if (gemDetails[key]) return `**${titleize(key)}:** ${gemDetails[key].toLocaleString()}`;
      })
      .join("\n\n");
  };

  const mapDependencies = (gemDetails: GemDetailResponse) => {
    const mapDependencyListItems = (label: string, dependencies: Dependency[]) => {
      if (dependencies.length) {
        return [
          `**${label}**\n\n`,
          dependencies
            .map((dependency) => {
              return `- **${dependency.name}** _${dependency.requirements}_`;
            })
            .join("\n\n"),
        ].join("\n\n");
      }
    };

    return [
      `## Dependencies`,
      mapDependencyListItems("Runtime", gemDetails["dependencies"]?.runtime || []),
      mapDependencyListItems("Development", gemDetails["dependencies"]?.development || []),
    ].join("\n\n");
  };

  const buildMarkdown = (gemDetails: GemDetailResponse) => {
    return [
      `# ${gemDetails["name"]}\n\n`,
      `> ${gemDetails["info"]}\n\n`,
      `**License** ${gemDetails?.licenses?.join(", ") || "n/a"}`,
      mapInfoValues(gemDetails),
      mapDependencies(gemDetails),
    ].join("\n\n");
  };

  const loadGemDetails = async () => {
    setLoading(true);
    const gemDetails = await useRubyGemsGemDetail(gem.name);
    if (gemDetails?.name) setGemInfo(buildMarkdown(gemDetails));
    setLoading(false);
  };

  useEffect(() => {
    loadGemDetails();
  }, []);

  return (
    <Detail
      isLoading={loading}
      key={gem.sha}
      navigationTitle={`Search RubyGems > ${gem.name} > details`}
      markdown={`${gemDetails}`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser icon={Icon.Globe} key={gem.name} title="Open on rubygems.org" url={gem.project_uri} />
          {mapGemLinks(gem).map((link) => {
            return (
              <Action.OpenInBrowser
                icon={Icon.Globe}
                key={link["title"]}
                title={`Open ${link["title"]}`}
                url={link["link"]}
              />
            );
          })}
        </ActionPanel>
      }
    />
  );
};
