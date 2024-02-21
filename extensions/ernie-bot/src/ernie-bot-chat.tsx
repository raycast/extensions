import {
    Detail, ActionPanel, Action, List, Form, useNavigation,
    getPreferenceValues, showHUD, Toast, showToast
} from "@raycast/api";
import { ERNIEBotApi, Model, Role } from 'ernie-bot-js';
import { useEffect, useState } from "react";

interface FormValues {
    query: string;
    model: Model;
}

interface ChatProps extends FormValues {
    // history: any[];
    // onHistoryChange: (e: any) => void;
}

function Chat({ query, model }: ChatProps) {
    console.log('model', model)
    const [output, setOutput] = useState("")
    const handleSumbit = async () => {
        const preference = getPreferenceValues()
        if (!preference.ak || !preference.sk) {
            console.log('ak or sk is empty')
            await showHUD('ak or sk is empty')
        }
        const ernie = new ERNIEBotApi({
            apiKey: preference.ak,
            secretKey: preference.sk,
        })
        const toast = await showToast({
            style: Toast.Style.Animated,
            title: "Generating Response...",
        });
        const res = await ernie.createChatCompletionStream({
            messages: [{
                role: Role.USER,
                content: query,
            }],
            model
        })
        let errorMessage = ''
        for await (const msg of res.data) {
            if (!msg.result) {
                errorMessage = msg.error_msg
            } else {
                setOutput(e => e + msg.result)
            }
        }
        if (errorMessage) {
            setOutput('Error: ' + errorMessage)
            toast.style = Toast.Style.Failure
            toast.title = errorMessage
            return
        }
        toast.style = Toast.Style.Success
        toast.title = "Response Generated"
    }

    useEffect(() => {
        handleSumbit();
    }, [])
    return (
        <Detail
            markdown={output}
            actions={
                <ActionPanel>
                    <Action title="Copy to Clipboard" onAction={handleSumbit} />
                </ActionPanel>
            }
            metadata={
                <Detail.Metadata>
                    <Detail.Metadata.Label title="Query" text={query} />
                </Detail.Metadata>
            } />
    )
}

export default function Command() {
    const { pop, push } = useNavigation();
    // const [history, setHistory] = useState<any[]>([])
    const handleSearchTextChange = ({ query, model }: FormValues) => {
        // setHistory(e => [...e, { query }])
        push(
            <Chat
                // history={[...history, { query }]}
                // onHistoryChange={setHistory}
                query={query}
                model={model}
            />
        )
    }

    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm
                        onSubmit={handleSearchTextChange}
                    />
                </ActionPanel>
            }
        >
            <Form.TextArea
                enableMarkdown
                id="query"
                title="Query">
            </Form.TextArea>
            <Form.Dropdown
                id="model"
                title="Model"
                defaultValue="ERNIE_Bot_Turbo"
            >
                <Form.Dropdown.Item value="ERNIE_Bot_Turbo" title="ERNIE_Bot_Turbo" />
                <Form.Dropdown.Item value="ERNIE_Bot" title="ERNIE_Bot" />
                <Form.Dropdown.Item value="ERNIE_Bot_4" title="ERNIE_Bot_4" />
            </Form.Dropdown>
        </Form>
    );
}