import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { getApiKey, setApiKey } from "../utils/preferences";

export function SettingsView() {
    const [apiKey, setApiKeyState] = useState("");
    const { pop } = useNavigation();

    useEffect(() => {
        getApiKey().then(setApiKeyState);
    }, []);

    const handleSubmit = async (values: { apiKey: string }) => {
        await setApiKey(values.apiKey);
        setApiKeyState(values.apiKey);
        pop();
    };


    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
                </ActionPanel>
            }
        >
            <Form.PasswordField
                id="apiKey"
                title="API Key"
                placeholder="Enter your Shodan API key"
                value={apiKey}
            />
        </Form>
    );
}
