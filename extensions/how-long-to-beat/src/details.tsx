import { Action, ActionPanel, Detail } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { HowLongToBeatService, HowLongToBeatEntry } from "howlongtobeat";
import { baseUrl } from ".";
import { pluralize } from "./helpers";

const hltbService = new HowLongToBeatService();

interface DetailsProps {
  id: string;
  name: string;
}

interface DetailsState {
  result: HowLongToBeatEntry | null;
  isLoading: boolean;
}

export function Details(props: DetailsProps) {
  const { id, name } = props;

  const [state, setState] = useState<DetailsState>({ result: null, isLoading: true });

  const getDetails = useCallback(async function () {
    const result = await hltbService.detail(id);

    setState((oldState) => ({
      ...oldState,
      result,
      isLoading: false,
    }));
  }, []);

  const getMarkdown = useCallback(() => {
    if (state.isLoading) {
      return "";
    }

    if (state.result === null) {
      return "This game cannot be found...";
    }

    const { result } = state;

    // Description need to be parsed before to display it.
    const description = result.description.split("\t").shift();

    return `
<img src="https://howlongtobeat.com${result.imageUrl}" width="150" />
# ${result.name}
${description}

## ${pluralize(result.playableOn.length, "Platform")}
${result.playableOn.join(", ")}
    `;
  }, [state]);

  useEffect(() => {
    getDetails();
  }, []);

  const url = `${baseUrl}${id}`;

  const mainStoryHours = state.result?.gameplayMain || 0;
  const mainStoryText =
    mainStoryHours >= 1 ? `${state.result?.gameplayMain} ${pluralize(mainStoryHours, "hour")}` : "-";

  const mainExtraHours = state.result?.gameplayMainExtra || 0;
  const mainExtraText =
    mainExtraHours >= 1 ? `${state.result?.gameplayMainExtra} ${pluralize(mainExtraHours, "hour")}` : "-";

  const completionistsHours = state.result?.gameplayCompletionist || 0;
  const completionistsText =
    completionistsHours >= 1 ? `${state.result?.gameplayCompletionist} ${pluralize(completionistsHours, "hour")}` : "-";

  const metadata = !state.isLoading ? (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Main Story" text={mainStoryText} />
      <Detail.Metadata.Label title="Main + Extras" text={mainExtraText} />
      <Detail.Metadata.Label title="Completionists" text={completionistsText} />
    </Detail.Metadata>
  ) : null;

  return (
    <Detail
      isLoading={state.isLoading}
      navigationTitle={name}
      markdown={getMarkdown()}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={url} />
          <Action.CopyToClipboard title="Copy URL" content={url} />
        </ActionPanel>
      }
      metadata={metadata}
    />
  );
}
