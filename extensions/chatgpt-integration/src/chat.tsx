import {Detail, List, LaunchProps} from '@raycast/api'
import {useState, useEffect} from "react";
import {fetchChatResponse} from "./api";

interface PromptText {
    prompt: string;
}

export default function askGPT(props: LaunchProps<{ arguments: PromptText }>) {
    const [response, setResponse] = useState("");
    const { prompt } = props.arguments;

    useEffect(() => {
        async function callApi() {
            try {
                const strResponse = await fetchChatResponse(prompt);
                setResponse(strResponse);
            } catch (err) {
                console.log(err)
            }
        }
        callApi();
    }, [])
    return (
        <Detail
            markdown={response}
            metadata={
            <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Prompt" text={prompt} />
                <List.Item.Detail.Metadata.Label title="Date" text={new Date().toLocaleString()} />
            </List.Item.Detail.Metadata>
            }
        />
    )
}