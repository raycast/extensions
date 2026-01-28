import { capitalize } from "../utils/functions";
import { Detail } from "@raycast/api";
import ModChangelogAPIResponse from "../models/ModChangelogAPIResponse";
import { modrinthColors } from "../utils/constants";
import VersionInteractionMenu from "../components/VersionInteractionMenu";

export default function VersionsDetailView({
  data,
  slug,
  projectType,
}: {
  data: ModChangelogAPIResponse;
  slug: string;
  projectType: string;
}) {
  return (
    <Detail
      markdown={`# Changelog\n${data.changelog.length === 0 ? "No changelog specified." : data.changelog}`}
      navigationTitle={`Details for ${data.name}`}
      actions={<VersionInteractionMenu data={data} slug={slug} projectType={projectType} />}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title={"Release Channel"} text={capitalize(data.version_type)} />
          <Detail.Metadata.Label title={"Version Number"} text={data.version_number.toString()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList
            title={"Platforms"}
            children={data.loaders.map((curr) => (
              <Detail.Metadata.TagList.Item
                text={capitalize(curr)}
                icon={{ source: `${curr}.svg`, tintColor: modrinthColors.get(curr) }}
                color={modrinthColors.get(curr)}
                key={curr}
              />
            ))}
          />
          <Detail.Metadata.TagList
            title={"Game Versions"}
            children={data.game_versions.map((curr) => (
              <Detail.Metadata.TagList.Item text={curr} key={curr} color={modrinthColors.get("default")} />
            ))}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title={"Downloads"} text={(data.downloads as number).toLocaleString()} />
          <Detail.Metadata.Label title={"Publication Date"} text={new Date(data.date_published).toLocaleString()} />
        </Detail.Metadata>
      }
    />
  );
}
