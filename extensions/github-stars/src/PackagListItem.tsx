import {
  List,
  Icon,
  ActionPanel,
  OpenInBrowserAction,
  PushAction,
  ImageMask,
  CopyToClipboardAction,
  environment,
} from "@raycast/api";
import { Readme } from "./Readme";
import { Star } from "./response.model";

interface PackageListItemProps {
  result: Star;
}

const MAXIMUM_CHARACTERS = environment.textSize === "large" ? 85 : 100;

const formatCompactNumber = (number: number): string => {
  const fractionDigits = number >= 1000 ? 1 : 0;

  const formatter = new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

  return formatter.format(number);
};

const calculateCharactersLeft = (name: string, stars: string): number => {
  return MAXIMUM_CHARACTERS - name.length - stars.length - 1;
};

const getDescription = (description = "", charactersLeft = 0): string => {
  if (description.length > charactersLeft) {
    return `${description?.substring(0, charactersLeft - 3)}...`;
  }
  return description;
};

export const PackageListItem = ({ result }: PackageListItemProps): JSX.Element => {
  const descriptionAsArray = result?.description ? result.description.split(" ") : [];
  const keywords = [result.name, ...descriptionAsArray];

  const stars = `★ ${formatCompactNumber(result.stargazers_count)}`;

  const charactersLeftForDescription = calculateCharactersLeft(result.full_name, stars);
  const description = getDescription(result?.description, charactersLeftForDescription);

  return (
    <List.Item
      id={result.node_id}
      title={result.full_name}
      subtitle={description}
      icon={{
        source: result.owner.avatar_url,
        mask: ImageMask.Circle,
      }}
      accessoryTitle={stars}
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
