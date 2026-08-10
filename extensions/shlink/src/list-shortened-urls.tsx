import { Action, ActionPanel, Alert, Color, Icon, Keyboard, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { showFailureToast, useCachedState } from "@raycast/utils";
import { useCallback, useEffect, useRef, useState } from "react";

import { apiClient } from "./api/shlinkClient";

type ShlinkShortUrlsList = Awaited<ReturnType<typeof apiClient.listShortUrls>>;
type ShlinkShortUrls = ShlinkShortUrlsList["data"];

interface State {
    searchText: string;
    isLoading: boolean;
    hasMore: boolean;
    data: ShlinkShortUrls;
    nextPage: number;
}

const pageSize = 20;

export default function Command() {
    const [state, setState] = useState<State>({
        searchText: "",
        isLoading: true,
        hasMore: true,
        data: [],
        nextPage: 1,
    });
    const [error, setError] = useState<Error | null>(null);
    const cancelRef = useRef<AbortController | null>(null);
    const [showQR, setShowQR] = useCachedState<boolean>("showQR", false);

    const loadNextPage = useCallback(async (searchText: string, nextPage: number, signal?: AbortSignal) => {
        setState((previous) => ({ ...previous, isLoading: true }));
        try {
            const newData = await apiClient.listShortUrls({
                page: nextPage.toString(),
                itemsPerPage: pageSize,
                searchTerm: searchText,
            });
            if (signal?.aborted) {
                return;
            }
            setState((previous) => ({
                ...previous,
                isLoading: false,
                hasMore: newData.pagination.currentPage < newData.pagination.pagesCount,
                data: [...previous.data, ...newData.data],
            }));
        } catch (error) {
            setError(error);
            return;
        }
    }, []);

    const onLoadMore = useCallback(() => {
        setState((previous) => ({ ...previous, nextPage: previous.nextPage + 1 }));
    }, []);

    const onSearchTextChange = useCallback(
        (searchText: string) => {
            if (searchText === state.searchText) return;
            setState((previous) => ({
                ...previous,
                data: [],
                nextPage: 1,
                searchText,
            }));
        },
        [state.searchText],
    );

    useEffect(() => {
        cancelRef.current?.abort();
        cancelRef.current = new AbortController();
        loadNextPage(state.searchText, state.nextPage, cancelRef.current?.signal);
        return () => {
            cancelRef.current?.abort();
        };
    }, [loadNextPage, state.searchText, state.nextPage]);

    const deleteShortenedURL = useCallback(async (shortCode: string) => {
        confirmAlert({
            title: "Delete Shortened URL",
            message: "Are you sure you want to delete this shortened URL?",
            primaryAction: {
                title: "Delete",
                style: Alert.ActionStyle.Destructive,
                onAction: () => tryDeleteShoretenedURL(shortCode),
            },
        });
    }, []);

    const tryDeleteShoretenedURL = useCallback(
        async (shortCode: string) => {
            const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting URL..." });

            try {
                await apiClient.deleteShortUrl(shortCode);
                setState((previous) => ({
                    ...previous,
                    data: previous.data.filter((item) => item.shortCode !== shortCode),
                }));
                toast.style = Toast.Style.Success;
                toast.title = "URL deleted";
            } catch (error) {
                await showFailureToast(error, {
                    title: "Failed to delete URL",
                    primaryAction: {
                        title: "Retry",
                        onAction: () => tryDeleteShoretenedURL(shortCode),
                    },
                });
            }
        },
        [state],
    );

    return (
        <List
            isLoading={state.isLoading}
            onSearchTextChange={onSearchTextChange}
            pagination={{ onLoadMore, hasMore: state.hasMore, pageSize }}
            isShowingDetail
        >
            {error && (
                <List.EmptyView
                    title="Failed to fetch shortened URLs"
                    description={error.message}
                    icon={{ source: Icon.Warning, tintColor: Color.Red }}
                />
            )}
            {state.data.map((item) => (
                <List.Item
                    key={item.shortCode}
                    title={`${item.title}`}
                    accessories={[
                        {
                            text: String(item.visitsSummary.total),
                            icon: { source: Icon.Mouse, tintColor: Color.Yellow },
                            tooltip: "Visits",
                        },
                        { date: new Date(item.dateCreated), icon: Icon.Calendar, tooltip: "Updated At" },
                    ]}
                    detail={
                        <List.Item.Detail
                            markdown={
                                showQR
                                    ? `![QRCode for short url](${item.shortUrl}/qr-code?roundBlockSize=true&size=200&margin=10&format=png)`
                                    : null
                            }
                            metadata={
                                <List.Item.Detail.Metadata>
                                    <List.Item.Detail.Metadata.Link
                                        title={"Short URL"}
                                        text={item.shortUrl}
                                        target={item.shortUrl}
                                    />
                                    <List.Item.Detail.Metadata.Separator />
                                    <List.Item.Detail.Metadata.Link
                                        title={"Long URL"}
                                        text={item.longUrl}
                                        target={item.longUrl}
                                    />
                                    <List.Item.Detail.Metadata.Separator />
                                    <List.Item.Detail.Metadata.Label
                                        title={"Total visits"}
                                        text={
                                            item.meta.maxVisits
                                                ? item.visitsSummary.total + " / " + item.meta.maxVisits
                                                : item.visitsSummary.total.toString()
                                        }
                                        icon={{ source: Icon.Mouse, tintColor: Color.Yellow }}
                                    />
                                    <List.Item.Detail.Metadata.Label
                                        title={"Non-bot visits"}
                                        text={item.visitsSummary.nonBots.toString()}
                                        icon={{ source: Icon.Person, tintColor: Color.Green }}
                                    />
                                    <List.Item.Detail.Metadata.Label
                                        title={"Bot visits"}
                                        text={item.visitsSummary.bots.toString()}
                                        icon={{ source: Icon.ComputerChip, tintColor: Color.Red }}
                                    />
                                    <List.Item.Detail.Metadata.Separator />
                                    {item.tags && item.tags.length > 0 && (
                                        <>
                                            <List.Item.Detail.Metadata.TagList title="Tags">
                                                {item.tags.map((t) => (
                                                    <List.Item.Detail.Metadata.TagList.Item
                                                        key={t}
                                                        text={t}
                                                        icon={Icon.Tag}
                                                        color={Color.Blue}
                                                    />
                                                ))}
                                            </List.Item.Detail.Metadata.TagList>
                                            <List.Item.Detail.Metadata.Separator />
                                        </>
                                    )}
                                    <List.Item.Detail.Metadata.Label
                                        title={"Valid since"}
                                        text={
                                            item.meta.validSince
                                                ? item.meta.validSince.substring(0, 19).replace("T", " ")
                                                : "∞"
                                        }
                                        icon={Icon.Calendar}
                                    />
                                    <List.Item.Detail.Metadata.Label
                                        title={"Valid until"}
                                        text={
                                            item.meta.validUntil
                                                ? item.meta.validUntil.substring(0, 19).replace("T", " ")
                                                : "∞"
                                        }
                                        icon={Icon.Calendar}
                                    />
                                    <List.Item.Detail.Metadata.Separator />
                                    <List.Item.Detail.Metadata.Label
                                        title={"Crawlable"}
                                        text={item.crawlable ? "Yes" : "No"}
                                        icon={Icon.Globe}
                                    />
                                    <List.Item.Detail.Metadata.Label
                                        title={"Forward query"}
                                        text={item.forwardQuery ? "Yes" : "No"}
                                        icon={Icon.Link}
                                    />
                                    <List.Item.Detail.Metadata.Separator />
                                    <List.Item.Detail.Metadata.Label
                                        title={"Created at"}
                                        text={item.dateCreated.substring(0, 19).replace("T", " ")}
                                        icon={Icon.Calendar}
                                    />
                                </List.Item.Detail.Metadata>
                            }
                        />
                    }
                    actions={
                        <ActionPanel>
                            <Action.CopyToClipboard title={"Copy Short URL"} content={item.shortUrl} />
                            <Action.CopyToClipboard
                                title="Copy QR Code URL"
                                content={`${item.shortUrl}/qr-code?roundBlockSize=true&size=200&margin=10&format=png`}
                            />
                            <Action.OpenInBrowser
                                title={"Open Short URL"}
                                url={item.shortUrl}
                                shortcut={{ key: "o", modifiers: ["opt"] }}
                            />
                            <Action
                                icon={{ source: Icon.AppWindowGrid3x3 }}
                                title={showQR ? "Hide QR Code" : "Show QR Code"}
                                onAction={() => {
                                    setShowQR(!showQR);
                                }}
                                shortcut={{ key: "q", modifiers: ["opt"] }}
                            />
                            <Action
                                icon={{ source: Icon.Trash, tintColor: Color.Red }}
                                title={"Delete Shortened URL"}
                                shortcut={Keyboard.Shortcut.Common.Remove}
                                onAction={() => deleteShortenedURL(item.shortCode)}
                            />
                        </ActionPanel>
                    }
                />
            ))}
        </List>
    );
}
