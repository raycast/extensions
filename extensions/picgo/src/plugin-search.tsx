import {
    ActionPanel,
    Action,
    List,
    Icon,
    Color,
    Clipboard,
    Toast,
    showToast,
    openExtensionPreferences,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import {} from "picgo";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { NPMSearchParams, NPMSearchResponse, NPMSearchObject } from "./types/npm";
import { NPM_SEARCH_URL } from "./util/npm";
import ErrorView from "./components/ErrorView";
import getPicGoContext from "./util/context";

export default function Command() {
    const [params, setParams] = useState<NPMSearchParams>({ text: "", size: 100, from: 0 });
    const { hasPlugin, installPlugin } = getPicGoContext();
    const [error, setError] = useState<Error | undefined>(undefined);

    const [updated, setUpdated] = useState<boolean>(false);

    const {
        data,
        isLoading,
        error: searchError,
        revalidate,
    } = useFetch<NPMSearchResponse, NPMSearchObject[], NPMSearchObject[]>(
        (_) => {
            const { size, text } = params;
            const finalText = text.trim().includes("picgo-plugin-") ? text.trim() : `picgo-plugin-${text.trim()}`;
            return `${NPM_SEARCH_URL}?${new URLSearchParams({ text: finalText, from: String(0), size: String(size) }).toString()}`;
        },
        {
            mapResult: (res) => {
                return {
                    data: res.objects
                        .filter((item) => item.package.name.includes("picgo-plugin-"))
                        .filter((item) => {
                            if (
                                item.package.description.includes("picgo.net") ||
                                item.package.description.includes("PicGo官方")
                            ) {
                                return false;
                            }
                            return true;
                        }),
                };
            },
            keepPreviousData: true,
            initialData: [],
        },
    );

    const isInstalled = useMemo(() => (item: NPMSearchObject) => hasPlugin(item.package.name), [data, updated]);

    const onSearchTextChange = useCallback(
        (text: string) => {
            if (text === params.text) return;
            setParams({ text, size: 20, from: 0 });
        },
        [params],
    );

    const handleInstall = async (item: NPMSearchObject) => {
        const toast = await showToast(Toast.Style.Animated, `Installing ${item.package.name}`);
        try {
            const res = await installPlugin([item.package.name]);
            if (!res.success) {
                throw new Error(`Failed to install '${item.package.name}'`, {
                    cause: res.body,
                });
            }
            toast.style = Toast.Style.Success;
            toast.message = `${item.package.name} installed.`;
        } catch (e) {
            setError(e as Error);
        } finally {
            toast.hide();
            setUpdated(!updated);
        }
    };

    useEffect(() => {
        if (!error) return;
        console.warn(error);
        showToast({
            style: Toast.Style.Failure,
            title: error.message,
            primaryAction: {
                title: "Open Extension Preferences",
                shortcut: { modifiers: ["cmd"], key: "o" },
                onAction: async (toast) => {
                    await openExtensionPreferences();
                    toast.hide();
                },
            },
            secondaryAction: {
                title: "Copy Error Log",
                shortcut: { modifiers: ["cmd"], key: "enter" },
                onAction: (toast) => {
                    Clipboard.copy(`${error.cause}\n${error.stack ?? error.message}`);
                    toast.hide();
                },
            },
        });
    }, [error]);

    if (searchError) {
        return (
            <ErrorView
                error={searchError}
                description="Error searching plugins"
                actions={
                    <ActionPanel>
                        <Action icon={Icon.ArrowClockwise} title="Retry Search" onAction={revalidate} />
                    </ActionPanel>
                }
            />
        );
    }

    return (
        <List
            isShowingDetail={data.length > 0}
            isLoading={isLoading}
            searchText={params.text}
            onSearchTextChange={onSearchTextChange}
            searchBarPlaceholder="Search PicGo plugins..."
        >
            {data.map((item) => (
                <List.Item
                    key={`${item.package.name}@${item.package.date}`}
                    title={item.package.name.replace("picgo-plugin-", "")}
                    subtitle={item.package.version}
                    icon={Icon.Plug}
                    accessories={
                        isInstalled(item)
                            ? [{ icon: { source: Icon.CheckCircle, tintColor: Color.Green }, tooltip: "Installed" }]
                            : []
                    }
                    actions={
                        <ActionPanel>
                            <Action
                                title="Install Plugin"
                                icon={Icon.Download}
                                onAction={() => handleInstall(item)}
                            ></Action>
                            <Action.OpenInBrowser title="Open in Browser" url={item.package.links.npm} />
                            <Action.OpenInBrowser
                                title="View Awesome-PicGo"
                                url="https://github.com/PicGo/Awesome-PicGo"
                            />
                        </ActionPanel>
                    }
                    detail={
                        <List.Item.Detail
                            metadata={
                                <List.Item.Detail.Metadata>
                                    <List.Item.Detail.Metadata.Label title="Name" text={item.package.name} />
                                    <List.Item.Detail.Metadata.Label
                                        title="Description"
                                        text={item.package.description}
                                    />
                                    <List.Item.Detail.Metadata.Label title="Version" text={item.package.version} />
                                    <List.Item.Detail.Metadata.Label
                                        title="Publisher"
                                        text={item.package.publisher.username}
                                    />
                                    <List.Item.Detail.Metadata.Label
                                        title="Last Updated"
                                        text={new Date(item.updated).toLocaleString()}
                                    />
                                    <List.Item.Detail.Metadata.TagList title="Downloads">
                                        <List.Item.Detail.Metadata.TagList.Item
                                            key="monthly"
                                            color={Color.Green}
                                            text={`Month: ${item.downloads.monthly.toString()}`}
                                        />
                                        <List.Item.Detail.Metadata.TagList.Item
                                            key="weekly"
                                            color={Color.Blue}
                                            text={`Week: ${item.downloads.weekly.toString()}`}
                                        />
                                    </List.Item.Detail.Metadata.TagList>
                                    <List.Item.Detail.Metadata.TagList title="Keywords">
                                        {item.package.keywords?.map((keyword, i) => (
                                            <List.Item.Detail.Metadata.TagList.Item
                                                key={`${keyword}-${i}`}
                                                text={keyword}
                                            />
                                        ))}
                                    </List.Item.Detail.Metadata.TagList>
                                    <List.Item.Detail.Metadata.Label
                                        title="Dependents"
                                        text={item.dependents.toString()}
                                    />
                                </List.Item.Detail.Metadata>
                            }
                        />
                    }
                />
            ))}
        </List>
    );
}
