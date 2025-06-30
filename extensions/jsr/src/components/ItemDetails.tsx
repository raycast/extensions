import { formatDistanceToNow } from "date-fns";
import { useEffect } from "react";

import type { Color } from "@raycast/api";
import { Detail, Icon, List, open } from "@raycast/api";
import { getProgressIcon, showFailureToast } from "@raycast/utils";

import type { SearchResultDocument } from "@/types";

import { compatIcons } from "@/lib/compat";

import { useDependencies, useDependents, usePackage } from "@/hooks/useJSRAPI";

const ItemDetails = ({
  item,
  progress,
  iconColor,
}: {
  item: SearchResultDocument;
  progress: number;
  iconColor: Color;
}) => {
  const icons = compatIcons(item);
  const { data, isLoading, error } = usePackage(item);

  const { data: dependentsData, isLoading: dependentsIsLoading } = useDependents(isLoading ? null : (data ?? null));
  const { data: dependenciesData, isLoading: dependenciesIsLoading } = useDependencies(
    isLoading ? null : (data ?? null),
    data?.latestVersion ?? null,
  );

  useEffect(() => {
    if (error) {
      console.error("Failed to fetch JSR item details", error);
      showFailureToast({
        title: "Error fetching JSR item details",
        message: error.message,
      });
    }
  }, [error]);

  return (
    <List.Item.Detail
      isLoading={isLoading || dependentsIsLoading || dependenciesIsLoading}
      markdown={[`## ${item.id}`, item.description].join("\n")}
      metadata={
        <Detail.Metadata>
          {data ? (
            <>
              <Detail.Metadata.Label
                title="Last Updated"
                text={data.updatedAt ? formatDistanceToNow(new Date(data.updatedAt), { addSuffix: true }) : "unknown"}
                icon={Icon.Clock}
              />
              <Detail.Metadata.Label title="Version" text={data.latestVersion ?? "unknown"} icon={Icon.ComputerChip} />
              <Detail.Metadata.Separator />
            </>
          ) : null}
          <Detail.Metadata.Label
            title="Score"
            text={item.score ? `${item.score.toString()}%` : "unknown"}
            icon={{
              source: getProgressIcon(progress / 100, iconColor, { backgroundOpacity: 0 }),
            }}
          />
          <Detail.Metadata.TagList title="Compatibility">
            {icons.map((ico) => (
              <Detail.Metadata.TagList.Item key={ico.text} text={ico.text} icon={ico.icon} />
            ))}
          </Detail.Metadata.TagList>
          {dependenciesData && dependenciesData.length > 0 ? (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.TagList title="Dependencies">
                {dependenciesData?.map((dep) => (
                  <Detail.Metadata.TagList.Item
                    key={`${dep.kind}:${dep.name}${dep.path ? `/${dep.path}` : ""}`}
                    text={`${dep.kind}:${dep.name}${dep.path ? `/${dep.path}` : ""}`}
                    onAction={() => {
                      if (dep.kind === "jsr") {
                        open(`https://jsr.io/${dep.name}`);
                      } else if (dep.kind === "npm") {
                        open(`https://www.npmjs.com/package/${dep.name}`);
                      }
                    }}
                  />
                ))}
              </Detail.Metadata.TagList>
            </>
          ) : null}
          {dependentsData?.items && dependentsData?.items.length > 0 ? (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.TagList title="Dependents">
                {dependentsData?.items.map((dep) => (
                  <Detail.Metadata.TagList.Item
                    key={`@${dep.scope}/${dep.package}`}
                    text={`@${dep.scope}/${dep.package}`}
                    onAction={() => {
                      open(`https://jsr.io/@${dep.scope}/${dep.package}`);
                    }}
                  />
                ))}
              </Detail.Metadata.TagList>
            </>
          ) : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="JSR" text="View on jsr.io" target={`https://jsr.io/${item.id}`} />
          {data?.githubRepository?.owner && data?.githubRepository?.name ? (
            <Detail.Metadata.Link
              title="GitHub"
              text="View on GitHub"
              target={`https://github.com/${data.githubRepository.owner}/${data.githubRepository.name}`}
            />
          ) : null}
        </Detail.Metadata>
      }
    />
  );
};

export default ItemDetails;
