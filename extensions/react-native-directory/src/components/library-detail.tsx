import { List, Icon, Color, open } from "@raycast/api";
import { LibraryType } from "../types";
import {
  formatBytes,
  getCompatibilityColor,
  getCompatibilityTags,
  getPlatformColor,
  getSupportedPlatforms,
  getTimeSinceToday,
} from "../utils";
import { CHROME_APPLICATION, SCORING_URL } from "../constants";

const Metadata = ({ library }: { library: LibraryType }) => {
  const compatibilityTags = getCompatibilityTags(library);
  const platformTags = getSupportedPlatforms(library);

  return (
    <List.Item.Detail.Metadata>
      {!!compatibilityTags.length && (
        <List.Item.Detail.Metadata.TagList title="Compatibility">
          {compatibilityTags.map((tag) => (
            <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} color={getCompatibilityColor(tag)} />
          ))}
        </List.Item.Detail.Metadata.TagList>
      )}

      <List.Item.Detail.Metadata.TagList title="Platforms">
        {platformTags.map((tag) => (
          <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} color={getPlatformColor(tag)} />
        ))}
      </List.Item.Detail.Metadata.TagList>

      <List.Item.Detail.Metadata.Separator />

      {library.github.urls.homepage && (
        <List.Item.Detail.Metadata.Link
          title="Website"
          text={library.github.urls.homepage}
          target={library.github.urls.homepage}
        />
      )}
      {!!library.examples?.length && (
        <List.Item.Detail.Metadata.TagList title="Examples">
          {library.examples.map((example, index) => (
            <List.Item.Detail.Metadata.TagList.Item
              key={example}
              text={`#${index + 1}`}
              color={Color.Blue}
              onAction={async () => await open(example, CHROME_APPLICATION)}
            />
          ))}
        </List.Item.Detail.Metadata.TagList>
      )}
      {library.github.hasNativeCode && <List.Item.Detail.Metadata.Label title="Native Code" icon={Icon.CodeBlock} />}
      {library.github.hasTypes && (
        <List.Item.Detail.Metadata.Label title="TypeScript Types" icon={{ source: "ts-icon.png" }} />
      )}
      {library.github?.license?.name && (
        <List.Item.Detail.Metadata.Label
          title="License"
          text={library.github.license.name === "Other" ? "Unrecognized License" : library.github.license.name}
          icon={Icon.Document}
        />
      )}

      <List.Item.Detail.Metadata.Separator />

      <List.Item.Detail.Metadata.TagList title="Directory Score">
        <List.Item.Detail.Metadata.TagList.Item
          text={`${library.score} / 100`}
          icon={Icon.Leaderboard}
          onAction={async () => await open(SCORING_URL, CHROME_APPLICATION)}
        />
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.TagList title="Updated">
        <List.Item.Detail.Metadata.TagList.Item
          text={getTimeSinceToday(library.github.stats.updatedAt)}
          icon={Icon.Clock}
        />
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.TagList title="Monthly Downloads">
        <List.Item.Detail.Metadata.TagList.Item
          text={library.npm?.downloads?.toLocaleString()}
          icon={Icon.Download}
          onAction={async () => await open(`https://www.npmjs.com/package/${library.npmPkg}`, CHROME_APPLICATION)}
        />
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.TagList title="Stars">
        <List.Item.Detail.Metadata.TagList.Item
          text={library.github.stats.stars.toLocaleString()}
          icon={Icon.Star}
          onAction={async () => await open(`${library.github.urls.repo}/stargazers`, CHROME_APPLICATION)}
        />
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.TagList
        title={`${library.github.stats.dependencies === 1 ? "Dependency" : "Dependencies"}`}
      >
        <List.Item.Detail.Metadata.TagList.Item
          text={library.github.stats.dependencies.toLocaleString()}
          icon={Icon.Box}
          onAction={async () =>
            await open(`https://www.npmjs.com/package/${library.npmPkg}?activeTab=dependencies`, CHROME_APPLICATION)
          }
        />
      </List.Item.Detail.Metadata.TagList>
      {library.npm?.size && (
        <List.Item.Detail.Metadata.TagList title="Package Size">
          <List.Item.Detail.Metadata.TagList.Item
            text={formatBytes(library.npm.size)}
            icon={Icon.Download}
            onAction={async () =>
              await open(`https://www.npmjs.com/package/${library.npmPkg}?activeTab=code`, CHROME_APPLICATION)
            }
          />
        </List.Item.Detail.Metadata.TagList>
      )}

      <List.Item.Detail.Metadata.TagList title="Forks">
        <List.Item.Detail.Metadata.TagList.Item
          text={library.github.stats.forks.toLocaleString()}
          icon={Icon.Duplicate}
          onAction={async () => await open(`${library.github.urls.repo}/network/members`, CHROME_APPLICATION)}
        />
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.TagList title="Watchers">
        <List.Item.Detail.Metadata.TagList.Item
          text={library.github.stats.subscribers.toLocaleString()}
          icon={Icon.Eye}
          onAction={async () => await open(`${library.github.urls.repo}/watchers`, CHROME_APPLICATION)}
        />
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.TagList title="Issues">
        <List.Item.Detail.Metadata.TagList.Item
          text={library.github.stats.issues.toLocaleString()}
          icon={Icon.ExclamationMark}
          onAction={async () => await open(`${library.github.urls.repo}/issues`, CHROME_APPLICATION)}
        />
      </List.Item.Detail.Metadata.TagList>
    </List.Item.Detail.Metadata>
  );
};

export const LibraryDetail = ({ library }: { library: LibraryType }) => {
  const markdown = `
  # ${library.github.name}
  
  ${library.github.description}
  
  ${library.images && library.images.length ? `\n### Images\n${library.images.map((image) => `![Image](${image})`).join("\n")}` : ""}
  `;

  return <List.Item.Detail markdown={markdown} metadata={<Metadata library={library} />} />;
};
