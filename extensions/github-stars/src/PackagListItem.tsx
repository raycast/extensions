import {
  List,
  Icon,
  ActionPanel,
  OpenInBrowserAction,
  PushAction,
  ImageMask,
  CopyToClipboardAction,
} from "@raycast/api";
import { Readme } from "./Readme";
import { Star } from "./response.model";

interface PackageListItemProps {
  result: Star;
}

export const PackageListItem = ({ result }: PackageListItemProps): JSX.Element => {
  const descriptionAsArray = result?.description ? result.description.split(" ") : [];
  const keywords = [result.name, ...descriptionAsArray];

  return (
    <List.Item
      id={result.node_id}
      title={result.full_name}
      subtitle={result.description}
      icon={{
        source: result.owner.avatar_url,
        mask: ImageMask.Circle,
      }}
      accessoryTitle={`★ ${result.stargazers_count}`}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={result.html_url} title="Open Repository" />
          <PushAction
            title="View README"
            target={<Readme user={result.owner.login} repo={result.name} />}
            icon={Icon.TextDocument}
          />
          <OpenInBrowserAction
            url={result.html_url.replace("github.com", "github.dev")}
            title="View Code in GitHub.dev"
            icon={{
              source: {
                light: "github-bright.png",
                dark: "github-dark.png",
              },
            }}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
          <OpenInBrowserAction
            url={`https://codesandbox.io/s/github/${result.full_name}`}
            title="View in CodeSandbox"
            icon={{
              source: {
                light: "codesandbox-bright.png",
                dark: "codesandbox-dark.png",
              },
            }}
          />
          <CopyToClipboardAction title="Copy gh repo clone Command" content={`gh repo clone ${result.full_name}`} />
          <CopyToClipboardAction title="Copy git clone SSH Command" content={`git clone ${result.ssh_url}`} />
          <CopyToClipboardAction title="Copy git clone HTTPS Command" content={`git clone ${result.clone_url}`} />
        </ActionPanel>
      }
      keywords={keywords}
    />
  );
};
