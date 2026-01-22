import { Detail, showToast, Toast } from "@raycast/api";
import { useMemo } from "react";
import { HltbSearch } from "./hltbsearch";
import { parseDetails } from "./details";
import { pluralize } from "./helpers";
import UserAgent from "user-agents";
import { useFetch } from "@raycast/utils";

interface GameDetailProps {
    id: string;
}

export function GameDetail({ id }: GameDetailProps) {
    const absoluteUrl = useMemo(() => new URL(id, HltbSearch.DETAIL_URL).href, [id]);

    const { isLoading, data: result } = useFetch(absoluteUrl, {
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
        onError(error) {
            showToast({ style: Toast.Style.Failure, title: "Error building detail page", message: String(error) });
        },
    });

    const markdown = useMemo(() => {
        if (isLoading) {
            return "";
        }

        if (!result) {
            return "This game cannot be found...";
        }

        const description = result.description.split("\t").shift();

        return `
<img src="${result.imageUrl}" width="150" />

# ${result.name}

${description}

## ${pluralize(result.playableOn.length, "Platform")}
${result.playableOn.join(", ")}
    `;
    }, [isLoading, result]);

    const mainStoryHours = result?.gameplayMain || 0;
    const mainStoryText = mainStoryHours >= 1 ? `${result?.gameplayMain} ${pluralize(mainStoryHours, "hour")}` : "-";

    const mainExtraHours = result?.gameplayMainExtra || 0;
    const mainExtraText =
        mainExtraHours >= 1 ? `${result?.gameplayMainExtra} ${pluralize(mainExtraHours, "hour")}` : "-";

    const completionistsHours = result?.gameplayCompletionist || 0;
    const completionistsText =
        completionistsHours >= 1 ? `${result?.gameplayCompletionist} ${pluralize(completionistsHours, "hour")}` : "-";

    return (
        <Detail.Metadata>
            <Detail.Metadata.Label title="Main Story" text={mainStoryText} />
            <Detail.Metadata.Label title="Main + Extras" text={mainExtraText} />
            <Detail.Metadata.Label title="Completionists" text={completionistsText} />
        </Detail.Metadata>
    );
}

export function useGameDetail(id: string, execute: boolean) {
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

    return { isLoading, result, markdown };
}
