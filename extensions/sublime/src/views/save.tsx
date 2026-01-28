import { Action, ActionPanel, Clipboard, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import {
    FreemiumLimitReachedError,
    getActiveUserInfo,
    getSuggestedCollections,
    previewLink,
    saveFileEntity,
    saveLink,
    saveTextEntity,
    searchCollections,
} from "../utils/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Collection, PageInfo } from "../utils/types";
import debounce from "lodash/debounce";
import mime from "mime";
import { getCollectionIcon } from "../utils/icons";
import { useActiveTab } from "../utils/use-active-tab";
import { stat } from "fs/promises";
import { isURL } from "../utils/url";

const maxFileSizeMb = 20;

export default function getSaveCommand(contentType: "Text" | "Link" | "File") {
    return function SaveCommand() {
        const { pop } = useNavigation();

        const { handleSubmit, itemProps, values, setValue } = useForm<{
            text?: string;
            link?: string;
            file?: string[];

            note: string;
            isFavorite: boolean;
            isPrivate: boolean;
        }>({
            async onSubmit(values) {
                if (privateError) {
                    return;
                }

                const toast = await showToast({
                    style: Toast.Style.Animated,
                    title: `Saving ${contentType}`,
                });

                const collections = collectionRows.map(({ collection }) => collection).filter(Boolean) as Collection[];
                const note = values.note.trim();

                try {
                    if (contentType === "Link") {
                        if (!isURL(values.link!)) {
                            toast.style = Toast.Style.Failure;
                            toast.title = "Please enter a valid link";
                            return;
                        }

                        const pageInfo = await pageInfoPromise.current;
                        if (!pageInfo) {
                            toast.style = Toast.Style.Failure;
                            toast.title = "Failed to access link";
                            return;
                        }

                        await saveLink(pageInfo, note, collections, values.isFavorite, values.isPrivate);
                    } else if (contentType === "Text") {
                        await saveTextEntity(values.text!, note, collections, values.isFavorite, values.isPrivate);
                    } else if (contentType === "File") {
                        const filePath = values.file![0];
                        const mimeType = mime.getType(filePath);
                        if (!mimeType) {
                            toast.style = Toast.Style.Failure;
                            toast.title = "Please provide a valid file";
                            return;
                        }

                        const fileInfo = await stat(filePath);
                        if (fileInfo.size > maxFileSizeMb * 1024 * 1024) {
                            toast.style = Toast.Style.Failure;
                            toast.title = "File is too large";
                            return;
                        }

                        await saveFileEntity(
                            mimeType,
                            filePath,
                            note,
                            collections,
                            values.isFavorite,
                            values.isPrivate,
                        );
                    }

                    toast.style = Toast.Style.Success;
                    toast.title = `Saved to Sublime`;
                    pop();
                } catch (error) {
                    toast.style = Toast.Style.Failure;

                    if (error instanceof FreemiumLimitReachedError) {
                        toast.title = userInfo?.limit_to_add_cards
                            ? `You've reached the limit of ${userInfo?.limit_to_add_cards} free cards`
                            : `You've reached the free cards limit`;
                    } else if (error instanceof Error && error.message.includes("File extension is not allowed")) {
                        toast.title = `File type is not supported`;
                    } else {
                        toast.title = `Failed saving to Sublime`;
                    }
                }
            },
            validation: {
                text: contentType === "Text" ? FormValidation.Required : undefined,
                file: contentType === "File" ? FormValidation.Required : undefined,
                link: contentType === "Link" ? FormValidation.Required : undefined,
                // Custom link validator does not work with local state unfortunately
            },
        });

        // Set isPrivate based on user settings
        const { data: userInfo } = useCachedPromise(getActiveUserInfo, []);
        useEffect(() => {
            setValue("isPrivate", !!userInfo?.privacy__default_private);
        }, [userInfo?.privacy__default_private]);

        // Keep link state manually to fix editability after clipboard paste
        const [link, setLink] = useState<string>("");
        function changeLink(link: string) {
            setLink(link);
            onLinkChangeDebounced(link);
        }

        // Fetch information for already saved links
        const pageInfoPromise = useRef<Promise<PageInfo | undefined>>();
        const onLinkChangeDebounced = useCallback(
            debounce((link: string) => {
                if (contentType === "Link" && link && isURL(link)) {
                    console.log("Fetching existing link pageInfo");
                    pageInfoPromise.current = previewLink(link);
                    pageInfoPromise.current.then((pageInfo) => {
                        if (pageInfo?.is_curator) {
                            setValue("note", pageInfo.notes?.[0]?.text || values.note);
                            setValue("isFavorite", pageInfo.is_favorite || values.isFavorite);
                            setValue("isPrivate", pageInfo.marked_as_private || values.isPrivate);
                            if (pageInfo.connections) {
                                setCollectionRows([
                                    ...pageInfo.connections.map((collection) => ({
                                        key: `${Math.random()}`,
                                        collection,
                                    })),
                                    ...collectionRows,
                                ]);
                            }
                        }
                    });
                }
            }, 200),
            [contentType],
        );

        // Set values automatically based on context
        const activeTab = useActiveTab();
        useEffect(() => {
            if (activeTab && !link) {
                changeLink(activeTab.url);
            }
        }, [activeTab]);
        useEffect(() => {
            Clipboard.read().then(({ text }) => {
                if (contentType === "Link" && text && isURL(text) && !link) {
                    changeLink(text);
                }
            });
        }, []);

        // Manually keep state for multiple collection dropdowns
        const [collectionRows, setCollectionRows] = useState<{ key: string; collection?: Collection }[]>([
            // key to reset state on collection remove
            { key: "0" },
        ]);
        const setSelectedCollectionAtIndex = (index: number) => {
            return (uuid: string) => {
                // Save collection objects to allow clearing search results
                const collection = visibleCollections.find((c) => c.uuid === uuid);

                const newCollectionRows = [...collectionRows];
                if (!collection && newCollectionRows[index] && index < newCollectionRows.length - 1) {
                    // Removed collection
                    newCollectionRows.splice(index, 1);
                } else {
                    // Update existing
                    newCollectionRows[index].collection = collection;
                }

                if (collection && index === newCollectionRows.length - 1) {
                    // Add placeholder for next collection
                    newCollectionRows.push({
                        key: `${Math.random()}`,
                    });
                }

                setCollectionRows(newCollectionRows);
            };
        };

        // Fetch recent collections
        const { data: recentCollections } = useCachedPromise(getSuggestedCollections, [], { initialData: [] });

        // Allow searching collections
        const [isSearchingCollections, setIsSearchingCollections] = useState(false);
        const [searchedCollections, setSearchedCollections] = useState<Collection[]>();
        async function onCollectionSearchChange(query: string) {
            if (!query) {
                setSearchedCollections(undefined);
                setIsSearchingCollections(false);
                return;
            }

            setIsSearchingCollections(true);
            const results = await searchCollections(query);

            setIsSearchingCollections(false);
            setSearchedCollections(results);
        }
        function onSearchBlur() {
            setIsSearchingCollections(false);
            setSearchedCollections(undefined);
        }
        const visibleCollections = searchedCollections ? searchedCollections : recentCollections;

        // Set privacy based on connected collections
        useEffect(() => {
            const collections = collectionRows.map(({ collection }) => collection).filter(Boolean) as Collection[];
            if (collections.length) {
                const hasNonPrivateCollections = collections.some(({ privacy }) => privacy !== "private");
                setValue("isPrivate", !hasNonPrivateCollections);
            }
        }, [collectionRows]);
        // Show error if private is selected and connected to public collections
        const privateError = useMemo(
            () =>
                values.isPrivate &&
                collectionRows.some(
                    ({ collection }) => collection?.privacy === "public" || collection?.privacy === "semiopen",
                ),
            [values.isPrivate, collectionRows],
        );

        return (
            <Form
                actions={
                    <ActionPanel>
                        <Action.SubmitForm onSubmit={handleSubmit} title={`Save to Sublime`} />
                    </ActionPanel>
                }
            >
                {contentType === "Link" && (
                    <Form.TextField
                        {...itemProps.link}
                        title="Link"
                        placeholder="Paste link"
                        value={link}
                        onChange={changeLink}
                    />
                )}
                {contentType === "Text" && <Form.TextArea {...itemProps.text} title="Text" placeholder="Type here" />}
                {contentType === "File" && (
                    <Form.FilePicker {...itemProps.file} title="File" allowMultipleSelection={false} />
                )}

                <Form.Separator />
                <Form.TextArea {...itemProps.note} title="Note" placeholder="Add note" />

                {collectionRows.map(({ key, collection }, index) => (
                    <Form.Dropdown
                        // Reset state on list change. Also reset if first list item to re-render title
                        key={`collection_${key}_${index === 0}`}
                        id={`collection_${key}_${index === 0}`}
                        title={index === 0 ? "Collections" : undefined}
                        placeholder="Search..."
                        filtering={false}
                        throttle
                        value={collection?.uuid || ""}
                        isLoading={isSearchingCollections}
                        onBlur={onSearchBlur}
                        onChange={setSelectedCollectionAtIndex(index)}
                        onSearchTextChange={onCollectionSearchChange}
                    >
                        <Form.Dropdown.Item
                            value=""
                            title={collection ? "Remove from collection" : "Add to collection"}
                        />
                        {collection && (
                            <Form.Dropdown.Item
                                key={collection.uuid}
                                value={collection.uuid}
                                title={collection.name}
                                icon={getCollectionIcon(collection)}
                            />
                        )}
                        {visibleCollections
                            // Connect each collection only once
                            .filter((c) => !collectionRows.some((row) => row.collection?.uuid === c.uuid))
                            .map((collection) => {
                                return (
                                    <Form.Dropdown.Item
                                        key={collection.uuid}
                                        value={collection.uuid}
                                        title={collection.name}
                                        icon={getCollectionIcon(collection)}
                                    />
                                );
                            })}
                    </Form.Dropdown>
                ))}

                <Form.Checkbox {...itemProps.isFavorite} title="Favorite" label="Mark as favorite" />
                <Form.Checkbox
                    {...itemProps.isPrivate}
                    title="Private"
                    label="Make private"
                    error={privateError ? "Cards added to public collections cannot be private" : undefined}
                />
            </Form>
        );
    };
}
