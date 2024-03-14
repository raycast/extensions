import {exec} from "child_process";
import {Action, ActionPanel, Clipboard, Color, Icon, List, showToast, Toast, useNavigation} from "@raycast/api";
import React, {memo, useEffect, useState} from "react";
import path from 'path';
import 'node-fetch';
import {TranscriptionCache, TranscriptionStatus, VoiceMemo} from "./interfaces";
import {
    clearCache,
    extractTimeFromFilePath,
    getCacheFilePath,
    getTranscriptionStatusIcon,
    readFromCache,
    saveToCache,
    timeAgo,
} from './services/utils';
import {SelectedMemo} from './components/SelectedMemo';

import nodeFetch from 'node-fetch';
import fs from "fs";
import {generateTitle, getTranscription, requestTranscription} from "./services/apiCalls";

globalThis.fetch = nodeFetch;

const pythonScriptPath = path.join(__dirname, "assets/list_voice_memos.py");

const useVoiceMemos = (pythonScriptPath: string, refetch: boolean) => {
    const [voiceMemos, setVoiceMemos] = useState<VoiceMemo[]>([]);

    useEffect(() => {
        exec(`python3 "${pythonScriptPath}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return;
            }
            const voiceMemoData = stdout.split('\n').filter(line => line.trim() !== '');
            const memos = voiceMemoData.map(line => {
                const [filePath, title] = line.split('|');
                const cacheFilePath = getCacheFilePath(filePath);
                const cache = readFromCache(cacheFilePath);
                const cacheTitle = cache && cache.title ? cache.title : null;
                const stats = fs.statSync(filePath);
                const date = extractTimeFromFilePath(filePath) || new Date(stats.mtimeMs);
                return {title: cacheTitle || title, filePath, date};
            });
            setVoiceMemos(memos);
        });
    }, [pythonScriptPath, refetch]);

    return voiceMemos;
};


const handleToggleArchive = async (memo: VoiceMemo) => {
    const cacheFilePath = getCacheFilePath(memo.filePath);
    let cache = readFromCache(cacheFilePath);

    if (cache) {
        cache.isArchived = !cache.isArchived;
        saveToCache(cacheFilePath, cache);
    }
};


export default function Command() {
    const [shouldRefetch, setShouldRefetch] = useState(false);
    const voiceMemos = useVoiceMemos(pythonScriptPath, shouldRefetch);
    const {push} = useNavigation();
    const [selectedMemo, setSelectedMemo] = useState<VoiceMemo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showArchived, setShowArchived] = useState(false);


    const handleSelectMemo = (memo: VoiceMemo, cache: TranscriptionCache | null) => {
        setSelectedMemo(memo);
        push(<SelectedMemo selectedMemo={memo} setSelectedMemo={setSelectedMemo} cache={cache}/>);
    };

    const handleToggleShowArchived = () => {
        setShowArchived(!showArchived);
    };

    const handleTranscribe = async (memo: VoiceMemo) => {
        setIsLoading(true);
        try {
            const cacheFilePath = getCacheFilePath(memo.filePath);
            let cache = readFromCache(cacheFilePath);

            if (!cache || cache.status === TranscriptionStatus.NOT_REQUESTED) {
                cache = await requestTranscription(memo.filePath);
                saveToCache(cacheFilePath, cache);
            }

            if (cache.status === TranscriptionStatus.REQUESTED) {
                const transcriptionResult = await getTranscription(cache.transcriptionId);
                cache.transcriptionResult = transcriptionResult;
                cache.status = TranscriptionStatus.COMPLETE;
                cache.title = await generateTitle(transcriptionResult.noTimestamps);

                saveToCache(cacheFilePath, cache);
            }

            setSelectedMemo({...memo, title: cache.title, transcriptionResult: cache.transcriptionResult});

            if (cache.transcriptionResult && cache.transcriptionResult.noTimestamps) {
                showToast(Toast.Style.Success, "Transcription Complete", cache.transcriptionResult.noTimestamps);
            } else {
                showToast(Toast.Style.Failure, "Transcription Error", "No transcription result found.");
            }
            setShouldRefetch((prev) => !prev);
        } finally {
            setShouldRefetch((prev) => !prev);
            setIsLoading(false);
        }
    };

    const handleTranscribeAll = async () => {
        setIsLoading(true);
        const delayBetweenRequests = 5000; // 5s delay between requests

        const memosToTranscribe = voiceMemos.filter((memo) => {
            const isArchived = readFromCache(getCacheFilePath(memo.filePath))?.isArchived;
            const transcriptExists = readFromCache(getCacheFilePath(memo.filePath))?.transcriptionResult !== undefined;
            return !isArchived && !transcriptExists;
        });

        const transcribePromises = memosToTranscribe.map((memo, index) => {
            const delay = index * delayBetweenRequests;
            return new Promise(async (resolve) => {
                setTimeout(async () => {
                    await handleTranscribe(memo);
                    resolve();
                }, delay);
            });
        });

        await Promise.all(transcribePromises);
        setShouldRefetch((prev) => !prev);
        setIsLoading(false);
    };
    const handleArchiveAll = async () => {
        setIsLoading(true);

        for (const memo of voiceMemos) {
            const cacheFilePath = getCacheFilePath(memo.filePath);
            let cache = readFromCache(cacheFilePath);

            if (!cache) {
                cache = {
                    resultUrl: "", summary: "", transcriptionId: "",
                    transcriptionResult: null,
                    title: memo.title,
                    status: TranscriptionStatus.NOT_REQUESTED,
                    isArchived: true
                };
                saveToCache(cacheFilePath, cache);
            } else if (!cache.isArchived) {
                cache.isArchived = true;
                saveToCache(cacheFilePath, cache);
            }
        }

        setShouldRefetch((prev) => !prev);
        setIsLoading(false);
    };


    const ListItem = ({memo, index, shouldRefetch}: { memo: VoiceMemo; index: number; shouldRefetch: boolean }) => {
        const passedCache = readFromCache(getCacheFilePath(memo.filePath));
        const transcript = passedCache?.transcriptionResult;
        const isArchived = readFromCache(getCacheFilePath(memo.filePath))?.isArchived;
        const transcribeActionTitle = transcript ? "View Transcript" : "Transcribe";

        useEffect(() => {
            // Force un re-rendu lorsque shouldRefetch change
        }, [shouldRefetch]);
        const handleTranscribeOrSelectMemo = async () => {
            if (!transcript) {
                await handleTranscribe(memo);
            } else {
                handleSelectMemo(memo, passedCache);
            }
        };

        return (
            <List.Item
                key={index}
                title={memo.title}
                icon={getTranscriptionStatusIcon(memo.filePath)}
                subtitle={memo.date ? timeAgo(memo.date) : ''}
                detail={
                    <List.Item.Detail
                        markdown={transcript ? `# ${memo.title}\n\n${transcript.noTimestamps}` : `# ${memo.title}`}
                    />
                }
                actions={
                    <ActionPanel>
                        <Action title={transcribeActionTitle} onAction={handleTranscribeOrSelectMemo}/>
                        {transcript && (
                            <Action
                                title="Copy Transcript"
                                onAction={() => Clipboard.copy(transcript.noTimestamps)}
                            />
                        )}
                        <Action
                            title={isArchived ? "Unarchive" : "Archive"}
                            onAction={async () => {
                                await handleToggleArchive(memo);
                                setShouldRefetch((prev) => !prev);
                            }}
                            shortcut={{modifiers: ["cmd"], key: "backspace"}}
                        />
                        <Action title={showArchived ? "Unshow archived" : "Show archived"}
                                onAction={handleToggleShowArchived}/>
                        <Action title="Clear Cache"
                                onAction={async () => {
                                    await clearCache(memo);
                                    setShouldRefetch((prev) => !prev);
                                }}/>

                    </ActionPanel>
                }
            />
        );
    };

    return (
        <List isShowingDetail isLoading={isLoading}>
            <List.Section title="Tools">
                <List.Item
                    title="Transcribe All"
                    icon={{source: Icon.Hammer, tintColor: Color.Blue}}
                    actions={
                        <ActionPanel>
                            <Action title="Transcribe All" onAction={handleTranscribeAll}/>
                        </ActionPanel>
                    }
                />
                <List.Item
                    title="Archive All"
                    icon={{source: Icon.Box, tintColor: Color.Blue}}
                    actions={
                        <ActionPanel>
                            <Action title="Archive All" onAction={handleArchiveAll}/>
                        </ActionPanel>
                    }
                />
                <List.Item
                    title={showArchived ? "Unshow Archived" : "Show Archived"}
                    icon={{source: Icon.Footprints, tintColor: Color.Blue}}
                    actions={
                        <ActionPanel>
                            <Action title={showArchived ? "Hide Archived" : "Show Archived"}
                                    onAction={handleToggleShowArchived}/>
                        </ActionPanel>
                    }
                />
            </List.Section>
            <List.Section title={showArchived ? "Archived memos" : "All memos"}>
                {voiceMemos.filter((memo) => {
                    const isArchived = readFromCache(getCacheFilePath(memo.filePath))?.isArchived;
                    return showArchived || !isArchived;
                }).map((memo, index) => (
                    <ListItem memo={memo} index={index} key={index} shouldRefetch={shouldRefetch}/>
                ))}
            </List.Section>
        </List>
    );
}
