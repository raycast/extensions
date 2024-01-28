import { Form, ActionPanel, Action, showToast } from "@raycast/api";
import { useState } from "react";

import axios from "axios";

interface Values {
    originalText: string;
    humanizedText: string;
}

export default function Command() {
    const [humanizedText, setHumanizedText] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);

    async function humanize(text: string): Promise<string | undefined> {
        try {
            const url = "https://aitohumanconverter.com/v3/process.php";
            const data = `text=${text}`;

            const response = await axios.post(url, data);

            showToast({ title: "Text Humanized", message: "Text successfully humanized!" });

            return response.data.data;
        } catch (error) {
            showToast({ title: "Error", message: "Failed to humanize text" });
        }
    }

    const handleSubmit = async (values: Values) => {
        console.log(values);
        setLoading(true);
        setHumanizedText((await humanize(values.originalText)) || "");
        setLoading(false);
    };

    return (
        <Form
            isLoading={loading}
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Humanize" onSubmit={handleSubmit} />
                    <Action.CopyToClipboard content={humanizedText} />
                </ActionPanel>
            }
        >
            <Form.TextArea autoFocus={true} id="originalText" title="Original text" />
            <Form.Separator />
            <Form.TextArea id="humanizedText" title="Humanized text" value={humanizedText} />
        </Form>
    );
}
