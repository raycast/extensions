import { Action, ActionPanel, Clipboard, Color, Detail, Icon, type LaunchProps } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { getClient } from "./lib/client";
import { pickLink, sourceLabel, type PickedLink } from "./lib/link-source";
import { linkFailureTitle, noMatchTitle, openQobuzSearch, resolveTrackLink, type LinkTrack } from "./lib/resolve-copy";
import { coverMarkdown, TrackActions, TrackMetadata } from "./lib/track-view";

const EMPTY_MESSAGE = ["# No track link", "", "Copy a Spotify, YouTube Music or Qobuz track link, or pass one."].join(
  "\n",
);

type Conversion = { picked: PickedLink; result: LinkTrack } | null;

// Show Current Track covers what Qobuz is playing, so with no link there is
// nothing to fall back to here.
const convert = async (argument: string): Promise<Conversion> => {
  const picked = pickLink(argument, await Clipboard.readText());
  if (!picked) return null;
  return { picked, result: await resolveTrackLink(await getClient(), picked.url) };
};

export default function Command(props: LaunchProps<{ arguments: Arguments.OpenSharedTrack }>) {
  const argument = props.arguments.link?.trim() ?? "";
  const { data, isLoading } = usePromise(convert, [argument], {
    onError: (error) => {
      showFailureToast(error, { title: "Couldn't open shared track" });
    },
  });

  return (
    <Detail
      isLoading={isLoading}
      markdown={buildMarkdown(data, isLoading)}
      metadata={renderMetadata(data)}
      actions={renderActions(data)}
    />
  );
}

const renderMetadata = (data: Conversion | undefined) => {
  if (!data?.result.ok) return undefined;
  const { picked, result } = data;
  const fromQobuz = picked.service === "qobuz";

  return (
    <TrackMetadata
      track={result.track}
      links={result.links}
      header={
        <>
          <Detail.Metadata.Label title="Source" text={sourceLabel(picked)} />
          {!fromQobuz && (
            <Detail.Metadata.TagList title="Qobuz Match">
              <Detail.Metadata.TagList.Item
                text={result.approximate ? "Approximate" : "Exact (ISRC)"}
                color={result.approximate ? Color.Orange : Color.Green}
              />
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Separator />
        </>
      }
    />
  );
};

const renderActions = (data: Conversion | undefined) => {
  if (!data) return undefined;
  const { picked, result } = data;

  if (result.ok) {
    return (
      <TrackActions
        track={result.track}
        links={result.links}
        primary={picked.service === "qobuz" ? "share" : "open-in-qobuz"}
      />
    );
  }

  if (result.reason === "no-match") {
    return (
      <ActionPanel>
        <Action
          title="Search on Qobuz"
          icon={Icon.MagnifyingGlass}
          onAction={() => openQobuzSearch(result.artist, result.title)}
        />
      </ActionPanel>
    );
  }

  return undefined;
};

const buildMarkdown = (data: Conversion | undefined, isLoading: boolean): string => {
  if (isLoading || data === undefined) return "";
  if (!data) return EMPTY_MESSAGE;

  const { picked, result } = data;
  if (result.ok) return coverMarkdown(result.track, result.album);

  if (result.reason === "no-match") {
    return [`# ${noMatchTitle(result.artist, result.title)}`, "", `${sourceLabel(picked)}. Try Search on Qobuz.`].join(
      "\n",
    );
  }

  return [
    `# ${linkFailureTitle(result.failure)}`,
    "",
    `${sourceLabel(picked)}: \`${picked.url}\``,
    "",
    "Open Shared Track takes a Spotify, YouTube Music or Qobuz track link.",
  ].join("\n");
};
