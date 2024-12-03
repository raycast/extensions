import { Detail } from "@raycast/api";
import { modrinthColors, newlinePlaceholder } from "../utils/constants";
import ProjectAPIResponseType from "../models/ProjectAPIResponseType";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { formatMinecraftVersions } from "../utils/functions";
import ProjectInteractionMenu from "../components/ProjectInteractionMenu";

export default function DetailView(props: {
  itemData: ProjectAPIResponseType | null;
  nhm: NodeHtmlMarkdown;
  projectType: string;
}) {
  return (
    <Detail
      isLoading={props.itemData == null}
      navigationTitle={`Details for ${props.itemData?.title ?? "Undefined"}`}
      actions={<ProjectInteractionMenu itemData={props.itemData} projectType={props.projectType} />}
      markdown={
        !props.itemData || !props.itemData.body
          ? ""
          : props.nhm
              .translate(props.itemData!.body.replaceAll("\n", newlinePlaceholder))
              .replaceAll(newlinePlaceholder, "\n")
              .replace(/\\/g, "")
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList
            title={"Compatible Versions"}
            children={formatMinecraftVersions(props.itemData?.game_versions ?? []).map((curr) => {
              return <Detail.Metadata.TagList.Item text={curr} color={modrinthColors.get("default")} key={curr} />;
            })}
          />
          <Detail.Metadata.TagList
            title={"Platforms"}
            children={props.itemData?.loaders.map((curr) => {
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
            {props.itemData?.client_side !== "unsupported" && props.itemData?.client_side !== "unknown" && (
              <Detail.Metadata.TagList.Item
                text="Client-side"
                icon={{ source: "client-side.svg", tintColor: modrinthColors.get("default") }}
                color={modrinthColors.get("default")}
              />
            )}
            {props.itemData?.server_side !== "unsupported" && props.itemData?.client_side !== "unknown" && (
              <Detail.Metadata.TagList.Item
                text="Server-side"
                icon={{ source: "server-side.svg", tintColor: modrinthColors.get("default") }}
                color={modrinthColors.get("default")}
              />
            )}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title={"Downloads"} text={(props.itemData?.downloads ?? -1).toLocaleString()} />
          <Detail.Metadata.Label title={"Followers"} text={(props.itemData?.followers ?? -1).toLocaleString()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title={""} text={"Report Issues"} target={props.itemData?.issues_url ?? ""} />
          <Detail.Metadata.Link title={""} text={"View Source"} target={props.itemData?.source_url ?? ""} />
          <Detail.Metadata.Link
            title={""}
            text={"Join the Discord Server"}
            target={props.itemData?.discord_url ?? ""}
          />
        </Detail.Metadata>
      }
    />
  );
}
