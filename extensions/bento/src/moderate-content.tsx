import React, { useState } from "react";
import {Action, ActionPanel, Form, useNavigation, showToast, Toast, Detail} from "@raycast/api";
import { moderateContent } from "./api-client";

export default function ModerateContent() {
    const [isLoading, setIsLoading] = useState(false);
    const { push } = useNavigation();

    const handleSubmit = async (values: { content: string }) => {
        setIsLoading(true);
        try {
            const result = await moderateContent(values.content);
            push(<ResultView result={result} />);
        } catch (error) {
            showToast({ style: Toast.Style.Failure, title: "Error", message: String(error) });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Form
            isLoading={isLoading}
            actions={
                <ActionPanel>
                    <Action.SubmitForm onSubmit={handleSubmit} />
                </ActionPanel>
            }
        >
            <Form.TextArea id="content" title="Content" placeholder="Enter content to moderate" />
        </Form>
    );
}

function ResultView({ result }: { result: any }) {
    const markdown = `
# Content Moderation Result

Valid: ${result.valid ? "Yes" : "No"}

Reasons:
${result.reasons.map((reason: string) => `- ${reason}`).join("\n")}

Safe Original Content: ${result.safe_original_content}
  `;

    return <Detail markdown={markdown} />;
}