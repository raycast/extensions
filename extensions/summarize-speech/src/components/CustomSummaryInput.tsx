import {Action, ActionPanel, Form, useNavigation} from "@raycast/api";
import React, {useState} from "react";
import {CustomSummaryInputProps} from "../interfaces";
import SummaryView from "./SummaryView";


export const CustomSummaryInput: React.FC<CustomSummaryInputProps> = ({text, summaryType: summaryType,  cache, selectedMemo, showTimestamps}) => {
    const [customSystemPrompt, setCustomSystemPrompt] = useState("You are a helpful assistant generating a summary.");
    const [customUserPrompt, setCustomUserPrompt] = useState("Write a summary for the following transcription:\n\n" + text);
    const {pop, push} = useNavigation();

    const handleSubmit = async () => {
        push(<SummaryView summaryType={summaryType}
                         cache={cache}
                         selectedMemo={selectedMemo}
                         showTimestamps={showTimestamps}
                         customSystemPrompt={customSystemPrompt}
                         customUserPrompt={customUserPrompt} />)
    };

    return (
        <Form
            actions={
                <ActionPanel>
                    <Action title="Generate Summary" onAction={handleSubmit}/>
                    <Action title="Cancel" onAction={pop}/>
                </ActionPanel>
            }
        >
            <Form.TextArea
                id="customSystemPrompt"
                title="Custom System Prompt"
                placeholder="Enter the custom system prompt"
                value={customSystemPrompt}
                onChange={setCustomSystemPrompt}
            />
            <Form.TextArea
                id="customUserPrompt"
                title="Custom User Prompt"
                placeholder="Enter the custom user prompt"
                value={customUserPrompt}
                onChange={setCustomUserPrompt}
            />
        </Form>
    );
};
