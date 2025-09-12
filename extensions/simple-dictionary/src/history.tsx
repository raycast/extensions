import { List, ActionPanel, Action, Icon, Alert, showToast, confirmAlert, Toast, launchCommand, LaunchType, Keyboard } from "@raycast/api";
import { JSX, useEffect, useState } from "react";
import History, { HistoryEntry } from "./classes/history";
import Dictionary from "./classes/dictionary";

export default function Command(): JSX.Element {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [searchText, setSearchText] = useState("");
    const [loading, setLoading] = useState(true);
    const [selectedLanguage, setSelectedLanguage] = useState<string>("All");

    useEffect(() => {
        const fetchHistory = async () => {
            const entries: HistoryEntry[] = await History.getEntries();
            setHistory(entries);
            setLoading(false);
        };
        fetchHistory();
    }, []);

    const langs: string[] = Array.from(new Set(history.map((h) => h.language)));

    return (
        <List
            isLoading={loading}
            searchText={searchText}
            onSearchTextChange={setSearchText}
            searchBarPlaceholder="Filter history entries by word..."
            filtering={true}
            searchBarAccessory={
                <List.Dropdown tooltip="Filter by language" storeValue={true} onChange={setSelectedLanguage} defaultValue="All">
                    <List.Dropdown.Item title="All" value="All" />
                    {langs.map((lang: string) => (
                        <List.Dropdown.Item
                            key={lang}
                            title={Dictionary.capitalize(lang)}
                            value={lang}
                        />
                    ))}
                </List.Dropdown>
            }
        >
            {!history.length ? (
                <List.EmptyView title="No history" />
            ) : (
                Object.entries(
                    history.reduce(
                        (
                            acc: {
                                [lang: string]: { word: string, epoch: number }[];
                            },
                            h: HistoryEntry,
                        ) => {
                            if (!acc[`${h.language}-${h.languageCode}`]) acc[`${h.language}-${h.languageCode}`] = [];
                            acc[`${h.language}-${h.languageCode}`].push({ word: h.word, epoch: h.epoch });
                            return acc;
                        },
                        {},
                    ),
                )
                    .filter(([lang]) => selectedLanguage === "All" || lang === selectedLanguage)
                    .sort(([langA], [langB]) => langA.localeCompare(langB))
                    .map(
                        ([langString, wordInfo]: [
                            string,
                            { word: string, epoch: number }[]
                        ]) => {
                            const [lang, langCode] = langString.split("-");
                            return (
                                <List.Section key={lang} title={`${Dictionary.capitalize(lang)} (${wordInfo.length})`}>
                                    {wordInfo
                                        .filter(({ word }) => word.toLowerCase().includes(searchText.toLowerCase()))
                                        .map(({ word, epoch }) => (
                                            <List.Item
                                                key={word}
                                                title={word}
                                                accessories={[
                                                    { icon: Icon.Clock, date: new Date(epoch) }
                                                ]}
                                                actions={
                                                    <ActionPanel>
                                                        <Action
                                                            title="Search Word"
                                                            icon={Icon.MagnifyingGlass}
                                                            shortcut={Keyboard.Shortcut.Common.Open}
                                                            onAction={async (): Promise<void> => {
                                                                try {
                                                                    await launchCommand({
                                                                        name: "search",
                                                                        type: LaunchType.UserInitiated,
                                                                        arguments: {
                                                                            language: langCode,
                                                                            word: word,
                                                                        },
                                                                    });
                                                                } catch {
                                                                    await showToast({
                                                                        style: Toast.Style.Failure,
                                                                        title: "Failed to search word",
                                                                        message: `There was an error searching for "${word}" (${Dictionary.capitalize(lang)})`,
                                                                    });
                                                                }
                                                            }}
                                                        />
                                                        <ActionPanel.Section>
                                                            <Action
                                                                title="Remove from History"
                                                                icon={Icon.Trash}
                                                                style={Action.Style.Destructive}
                                                                shortcut={Keyboard.Shortcut.Common.Remove}
                                                                onAction={async (): Promise<void> => {
                                                                    const options: Alert.Options = {
                                                                        title: "Remove from History",
                                                                        message: `"${word}" (${Dictionary.capitalize(lang)}) will be removed from your history`,
                                                                        primaryAction: {
                                                                            title: "Delete",
                                                                            style: Alert.ActionStyle.Destructive,
                                                                            onAction: async (): Promise<void> => {
                                                                                const success: boolean = await History.removeEntry(
                                                                                    lang,
                                                                                    word
                                                                                );

                                                                                if (success) {
                                                                                    const entries: HistoryEntry[] = await History.getEntries();
                                                                                    setHistory(entries);

                                                                                    await showToast({
                                                                                        style: Toast.Style.Success,
                                                                                        title: "Removed from History",
                                                                                        message: `"${word}" (${Dictionary.capitalize(lang)}) has been removed from your history`,
                                                                                    });
                                                                                } else {
                                                                                    await showToast({
                                                                                        style: Toast.Style.Failure,
                                                                                        title: "Failed to remove from History",
                                                                                        message: `"${word}" (${Dictionary.capitalize(lang)}) could not be found in your history`,
                                                                                    });
                                                                                }
                                                                            },
                                                                        },
                                                                    };

                                                                    await confirmAlert(options);
                                                                }}
                                                            />
                                                            <Action
                                                                title="Clear History"
                                                                icon={Icon.Trash}
                                                                style={Action.Style.Destructive}
                                                                shortcut={Keyboard.Shortcut.Common.RemoveAll}
                                                                onAction={async (): Promise<void> => {
                                                                    const options: Alert.Options = {
                                                                        title: "Clear History",
                                                                        message: `All history will be removed`,
                                                                        primaryAction: {
                                                                            title: "Delete",
                                                                            style: Alert.ActionStyle.Destructive,
                                                                            onAction: async (): Promise<void> => {
                                                                                const success: boolean = await History.removeAll();

                                                                                if (success) {
                                                                                    setHistory([]);
                                                                                    await showToast({
                                                                                        style: Toast.Style.Success,
                                                                                        title: "History Cleared",
                                                                                        message: `All history has been removed`,
                                                                                    });
                                                                                } else {
                                                                                    await showToast({
                                                                                        style: Toast.Style.Failure,
                                                                                        title: "Failed to clear history",
                                                                                        message: `Could not remove all history`,
                                                                                    });
                                                                                }
                                                                            },
                                                                        },
                                                                    };

                                                                    await confirmAlert(options);
                                                                }}
                                                            />
                                                        </ActionPanel.Section>
                                                    </ActionPanel>
                                                }
                                            />
                                        ))}
                                </List.Section>
                            )
                        }
                    )
            )}
        </List>
    );
}
