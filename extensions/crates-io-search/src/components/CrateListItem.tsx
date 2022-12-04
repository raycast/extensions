import { ActionPanel, Action, List, Icon } from "@raycast/api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { Crate } from "../types";

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

export default function CrateListItem(props: { crate: Crate }) {
  const accessory = `${dayjs().to(dayjs(props.crate.updated_at))}`;
  const doc_url = `https://docs.rs/${props.crate.name}`;
  const repo_url = props.crate.repository;

  let repo_site = "repository";
  let repo_icon = "git.svg";
  if (repo_url) {
    const url = new URL(repo_url);
    if (url.hostname === "github.com") {
      repo_site = "GitHub";
      repo_icon = "github.svg";
    } else if (url.hostname === "gitlab.com") {
      repo_site = "GitLab";
      repo_icon = "gitlab.svg";
    }
  }

  const homepage = props.crate.homepage;
  let homepage_icon_svg = `${homepage}/favicon.svg`;
  if (homepage?.startsWith("https://github.com")) {
    homepage_icon_svg = "github.svg";
  }

  const crate_url = `https://crates.io/crates/${props.crate.name}`;
  const dep_text = `${props.crate.name} = "${props.crate.max_stable_version}"`;

  const markdown = `
## ${props.crate.name} \`${props.crate.max_stable_version}\`

${props.crate.description}
  `;

  const accessories = [{ text: accessory, icon: Icon.Clock }];

  return (
    <List.Item
      title={props.crate.name}
      icon="cargo.png"
      id={props.crate.id}
      subtitle={`${props.crate.max_stable_version}`}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={doc_url} title="Open in docs.rs" icon="docs.rs.svg" />
            <Action.OpenInBrowser url={crate_url} title="Open in crates.io" icon="cargo-color.png" />
            <Action.OpenInBrowser url={repo_url} title={`Open ${repo_site} in Browser`} icon={repo_icon} />
            {homepage ? (
              <Action.OpenInBrowser
                url={homepage}
                title="Open homepage in Browser"
                icon={{
                  source: homepage_icon_svg,
                  fallback: Icon.Globe,
                }}
              />
            ) : null}
          </ActionPanel.Section>
          <Action.CopyToClipboard title="Copy Dependent" content={dep_text} />
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              {props.crate.owners && props.crate.owners.filter((owner) => owner != null).length > 0 && (
                <List.Item.Detail.Metadata.TagList title="Owners">
                  {props.crate.owners &&
                    props.crate.owners
                      .filter((owner) => owner != null && owner.name != null)
                      .map((owner) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={owner.name}
                          text={owner.name}
                          icon={owner.avatar as Icon}
                        />
                      ))}
                </List.Item.Detail.Metadata.TagList>
              )}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Version"
                text={`${props.crate.max_stable_version}`}
                icon={{
                  source: {
                    dark: "cargo-white.png",
                    light: "cargo-black.png",
                  },
                }}
              />
              <List.Item.Detail.Metadata.Label
                title="Updated"
                text={dayjs().to(dayjs(props.crate.updated_at))}
                icon={Icon.Clock}
              />
              <List.Item.Detail.Metadata.Label
                title="Created"
                text={dayjs().to(dayjs(props.crate.created_at))}
                icon={Icon.Clock}
              />
              <List.Item.Detail.Metadata.Label
                title="Downloads"
                text={new Intl.NumberFormat("en-US", { compactDisplay: "short", notation: "compact" }).format(
                  props.crate.downloads
                )}
                icon={Icon.Download}
              />

              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Link title="Repository" text="Open in browser" target={crate_url} />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}
