import { Detail } from "@raycast/api";
import { formatMinecraftVersions } from "../utils/functions";
import { MODRINTH_BASE_URL, modrinthColors, newlinePlaceholder } from "../utils/constants";
import { NodeHtmlMarkdown } from "node-html-markdown";
import ProjectAPIResponseType from "../models/ProjectAPIResponseType";
import ProjectInteractionMenu from "../components/ProjectInteractionMenu";

export default function DetailView({
  itemData,
  nhm,
  projectType,
}: {
  itemData: ProjectAPIResponseType | null;
  nhm: NodeHtmlMarkdown;
  projectType: string;
}) {
  return (
    <Detail
      isLoading={itemData == null}
      navigationTitle={`Details for ${itemData?.title ?? "Undefined"}`}
      actions={<ProjectInteractionMenu itemData={itemData} projectType={projectType} />}
      markdown={
        !itemData || !itemData.body
          ? ""
          : nhm
              .translate(itemData!.body.replaceAll("\n", newlinePlaceholder))
              .replaceAll(newlinePlaceholder, "\n")
              .replace(/\\/g, "")
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList
            title={"Compatible Versions"}
            children={formatMinecraftVersions(itemData?.game_versions ?? []).map((curr) => {
              return <Detail.Metadata.TagList.Item text={curr} color={modrinthColors.get("default")} key={curr} />;
            })}
          />
          <Detail.Metadata.TagList
            title={"Platforms"}
            children={itemData?.loaders.map((curr) => {
              return (
                <Detail.Metadata.TagList.Item
                  text={curr.charAt(0).toUpperCase() + curr.slice(1)}
                  color={modrinthColors.get(curr) ?? modrinthColors.get("default")}
                  key={curr}
                  icon={{ source: `${curr}.svg`, tintColor: modrinthColors.get(curr) ?? modrinthColors.get("default") }}
                />
              );
            })}
          />
          <Detail.Metadata.TagList title="Supported Environments">
            {itemData?.client_side !== "unsupported" && itemData?.client_side !== "unknown" && (
              <Detail.Metadata.TagList.Item
                text="Client-side"
                icon={{ source: "client-side.svg", tintColor: modrinthColors.get("default") }}
                color={modrinthColors.get("default")}
              />
            )}
            {itemData?.server_side !== "unsupported" && itemData?.client_side !== "unknown" && (
              <Detail.Metadata.TagList.Item
                text="Server-side"
                icon={{ source: "server-side.svg", tintColor: modrinthColors.get("default") }}
                color={modrinthColors.get("default")}
              />
            )}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title={"Downloads"} text={(itemData?.downloads ?? -1).toLocaleString()} />
          <Detail.Metadata.Label title={"Followers"} text={(itemData?.followers ?? -1).toLocaleString()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title={""} text={"Report Issues"} target={itemData?.issues_url ?? MODRINTH_BASE_URL} />
          <Detail.Metadata.Link title={""} text={"View Source"} target={itemData?.source_url ?? MODRINTH_BASE_URL} />
          <Detail.Metadata.Link
            title={""}
            text={"Join the Discord Server"}
            target={itemData?.discord_url ?? MODRINTH_BASE_URL}
          />
        </Detail.Metadata>
      }
    />
  );
}
