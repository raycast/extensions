import { ActionPanel, Action, Detail, environment } from "@raycast/api";
import { useEffect, useState } from "react";
import { searchReadMe } from "../nuget-client";
import { NugetPackage } from "../NugetPackage";
import { join } from "path";
import { GetCommandForCli, humanizeNumber } from "../utils";

export interface PackageDetailProps {
  package: NugetPackage;
}

interface State {
  isReadmeLoading: boolean;
  readme: string;
}

const nugetBaseUrl = "https://www.nuget.org/packages/";

export default function PackageDetail(props: PackageDetailProps): JSX.Element {
  const [state, setState] = useState<State>({ readme: props.package.description, isReadmeLoading: true });

  useEffect(() => {
    console.log("readme");
    searchReadMe(props.package).then((res) => {
      console.log(res);
      setState((oldState) => ({ ...oldState, isReadmeLoading: false, readme: res }));
    });
  }, []);

  function renderVersions(): JSX.Element[] {
    let isFirst = true;

    const _versions: JSX.Element[] = [];

    const revs = [...props.package.versions].reverse();

    revs.map((v) => {
      _versions.push(
        <Detail.Metadata.Link
          key={v.version}
          title={isFirst ? "Versions" : ""}
          target={`${nugetBaseUrl}${props.package.id}/${v.version}`}
          text={v.version}
        />
      );
      isFirst = false;
    });

    return _versions;
  }

  return (
    <Detail
      markdown={state.readme}
      navigationTitle={props.package.title}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title={props.package.id}
            text={props.package.title}
            icon={props.package.iconUrl || join(environment.assetsPath, "icon.png")}
          />
          <Detail.Metadata.Label title="Authors" text={props.package.authors.join("\t")} />
          <Detail.Metadata.Label title="Downloads" text={humanizeNumber(props.package.totalDownloads, "standard")} />
          <Detail.Metadata.TagList title="Tags">
            {props.package.tags.map((t) => (
              <Detail.Metadata.TagList.Item key={t} text={t} />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="About" target={nugetBaseUrl + props.package.id} text="View in NuGet Website" />
          <Detail.Metadata.Link title="" target={props.package.projectUrl} text="Source repository" />
          <Detail.Metadata.Separator />
          {renderVersions()}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Install Command" content={GetCommandForCli(props.package)} />
          <Action.Paste
            title="Paste to front-most"
            content={GetCommandForCli(props.package)}
            shortcut={{ modifiers: ["shift", "cmd"], key: "enter" }}
          />
          <Action.OpenInBrowser
            icon={join(environment.assetsPath, "icon.png")}
            url={`${nugetBaseUrl}${props.package.id}`}
            title="View in NuGet Website"
          />
          <Action.OpenInBrowser url={props.package.projectUrl} title="View Source repository" />
        </ActionPanel>
      }
    />
  );
}
