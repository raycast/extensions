import {List, ActionPanel, Detail, CopyToClipboardAction, PushAction, preferences} from "@raycast/api";
import {useEffect, useState} from "react";

interface State {
    query?: string;
    result?: string;
    type?: string;
    error?: Error;
    isLoading: boolean
}

const fastEvaluation = preferences?.fastEvaluation?.value ?? false;

export default function Command() {
    const [state, setState] = useState<State>({isLoading: false});
    useEffect(() => {
        if (!state.isLoading) return;
        try {
            let result;
            if (fastEvaluation) {
                result = eval(state.query?.trim() ?? "");
            }
            setState({
                result: JSON.stringify(result),
                type: type(result),
                isLoading: false,
                ...{query: state.query}
            });
        } catch (error: unknown) {
            setState({
                error: error instanceof Error ? error : (new Error("Unknown Error")),
                isLoading: false,
                ...{query: state.query}
            });
        }
    }, [state]);

    return fastEvaluation ? <FastEval/> : <SlowEval/>;

    function FastEval() {
        return <List
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
    }

    function SlowEval() {
        return <List
            searchBarPlaceholder="Type some Javascript to Evaluate and press return"
            isLoading={false}
            onSearchTextChange={(query: string) => {
                setState((oldState) => ({...oldState, query: query, isLoading: false}));
            }}
        >
            {(state?.query?.length ?? 0) === 0 ? null :
                <List.Item
                    title={`Evaluate: ${state?.query}`}
                    accessoryTitle="⏎  to evaluate"
                    actions={
                        <ActionPanel title="Evaluation result">
                            <PushAction title="Show Evaluation" icon="command-icon.png"
                                        target={<EvalResult state={state}/>}/>
                        </ActionPanel>}
                    icon="command-icon.png"
                />
            }
        </List>;
    }

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

    function EvalResult(props: { state: State }): JSX.Element {
        const {state} = props;
        let result;
        let error;
        try {
            result = eval(state.query?.trim() ?? "");
        } catch (err) {
            if (err instanceof Error) {
                error = err.message;
            } else if (typeof err === "string") {
                error = err
            }
        }

        return <Detail markdown={
            `### Code:
\`\`\`
${state.query}
\`\`\`

${error ? "Evaluation Error:" : `Evaluation result (\`${type(result)}\`):`}

\`\`\`
${error ?? JSON.stringify(result, null, 2)}
\`\`\`
            `} actions={<Actions state={state}/>}/>;
    }

    function type(object: { __proto__: { constructor: { name: string; }; }; }) {
        return object.__proto__.constructor.name;
    }
}
