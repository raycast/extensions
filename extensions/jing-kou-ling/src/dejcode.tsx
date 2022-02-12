import { ActionPanel, Action, List, showToast, Toast, Detail } from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import axios, { Axios } from "axios"

export default function DeCode() {
    const { state, decode }: { state: { result: IDcodeResult, isLoading: boolean }, decode: (encodeText: string) => Promise<Toast | void> } = useDecode()
    console.log(state);

    return (
        <List
            isLoading={state.isLoading}
            onSearchTextChange={decode}
            searchBarPlaceholder="粘贴需要解析的京东口令"
            throttle
        >
            <List.Section
                title="解析结果"
            >
                {
                    (Object.keys(state.result) as Array<keyof IDcodeResult>)
                        .map(<K extends keyof IDcodeResult>(key: K) => (
                            < DecodeItem key={key} title={key} value={state.result[key]} />
                        ))
                }
            </List.Section>
        </List>
    )
}

function DecodeItem({ title, value }: { title: string, value: string | number | undefined }) {
    return (
        <List.Item
            title={title}
            subtitle={`${value}`}
            actions={
                <ActionPanel>
                    <Action.CopyToClipboard title="复制到剪贴板" content={`${value}`} />
                </ActionPanel>
            }
        />
    )
}


function useDecode() {
    const [state, setState] = useState({ result: {}, isLoading: false })
    const cancelRef = useRef<AbortController | null>(null)
    async function decode(encodeText: string): Promise<void | Toast> {
        cancelRef.current?.abort()
        cancelRef.current = new AbortController()
        setState((oldState) => ({
            ...oldState,
            isLoading: true
        }))
        try {
            const { data } = await axios.post("https://api.jds.codes/jd/jcommand", { "code": encodeText })
            console.log(data);
            if (data.code === 200 && data.data) {
                setState({ result: data.data, isLoading: false })
            } else {
                setState({ result: {}, isLoading: false })
                return showToast({ style: Toast.Style.Failure, title: data.msg })
            }

        } catch (error) {
            console.log(error);
            setState({ result: {}, isLoading: false })
            return showToast({ style: Toast.Style.Failure, title: "发生错误" })
        }
    }
    useEffect(() => {
        return () => {
            cancelRef.current?.abort();
        };
    }, []);

    return {
        state,
        decode
    }
}

interface IDcodeResult {
    img?: string,
    headImg?: string,
    title?: string,
    userName?: string,
    jumpUrl?: string
}