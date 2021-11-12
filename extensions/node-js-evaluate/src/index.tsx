import {List, ActionPanel, CopyToClipboardAction} from "@raycast/api";
import {useEffect, useState} from "react";

interface State {
    query?: string;
    result?: string;
    type?: string;
    error?: Error;
    isLoading: boolean
}

export default function Command() {
    const [state, setState] = useState<State>({isLoading: false});
    useEffect(() => {
        if (!state.isLoading) return;
        try {
            const result = eval(state.query?.trim() ?? "");
            setState({
                result: JSON.stringify(result),
                type: typeof result,
                isLoading: false,
                ...{query: state.query}
            });
        } catch (error: unknown) {
            setState({
                error: error instanceof Error ? error : (new Error("Unknown Error")),
                isLoading: false,
                ...{query: state.query}});
        }
    }, [state]);

    return (
        <List
            searchBarPlaceholder="Type some Javascript to Evaluate"
            isLoading={state.isLoading || (!state.result && !state.error)}
            onSearchTextChange={(query: string) => {
                setState((oldState) => ({...oldState, query: query, isLoading: true}));
            }}
        >
            {(state?.query?.length ?? 0) === 0 ? null :
                <List.Item
                    title={(state?.result ?? state?.error?.message) ?? "Unknown Error"}
                    subtitle={state?.type}
                    accessoryTitle={state?.error?.message ? "Error" : "JS Evaluation"}
                    actions={<Actions state={state}/>}
                    icon="command-icon.png"
                />
            }
        </List>
    );

    function Actions(props: { state: State }) {
        return (
            <ActionPanel title="Evaluation result">
                <ActionPanel.Section>
                    {props.state?.result &&
                    <CopyToClipboardAction title="Copy Result to Clipboard" content={props.state.result}/>}
                    {props.state?.query &&
                    <CopyToClipboardAction title="Copy Code to Clipboard" content={props.state.query}/>}
                </ActionPanel.Section>
            </ActionPanel>
        );
    }
}
