import { useMemo } from "react";
import { useFetch } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";
import UserAgent from "user-agents";
import { HltbSearch } from "./hltbsearch";
import { parseDetails } from "./details";
import { pluralize } from "./helpers";
import { HowLongToBeatEntry } from "howlongtobeat";

export function useGameDetailFetch(id: string, execute = true) {
  const absoluteUrl = useMemo(() => new URL(id, HltbSearch.DETAIL_URL).href, [id]);

  const fetchOptions = useMemo(
    () => ({
      headers: {
        "User-Agent": new UserAgent().toString(),
        origin: "https://howlongtobeat.com",
        referer: "https://howlongtobeat.com",
      },
      mapResult(html: string) {
        return {
          data: parseDetails(html, id),
        };
      },
      onError(error: Error) {
        showToast({ style: Toast.Style.Failure, title: "Error building detail page", message: String(error) });
      },
      execute,
    }),
    [id, execute],
  );

  const { isLoading, data: result } = useFetch(absoluteUrl, fetchOptions);

  const markdown = useMemo(() => {
    if (isLoading) {
      return "";
    }

    if (!result) {
      return "This game cannot be found...";
    }

    const description = result.description.split("\t").shift();

    return `
<img src="${result.imageUrl}" width="200" />

# ${result.name}

${description}

## ${pluralize(result.playableOn.length, "Platform")}
${result.playableOn.join(", ")}
    `;
  }, [isLoading, result]);

  return { isLoading, data: result, markdown };
}

export type GameDetailResult = HowLongToBeatEntry | undefined;
