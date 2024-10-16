import React, { useState } from "react";
import {Action, ActionPanel, Form, useNavigation, showToast, Toast, Detail} from "@raycast/api";
import { validateEmail } from "./api-client";

export default function ValidateEmail() {
    const [isLoading, setIsLoading] = useState(false);
    const { push } = useNavigation();

    const handleSubmit = async (values: { email: string; name?: string; userAgent?: string; ip?: string }) => {
        setIsLoading(true);
        try {
            const result = await validateEmail(values.email, values.name, values.userAgent, values.ip);
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
            <Form.TextField id="email" title="Email" placeholder="Enter email to validate" />
            <Form.TextField id="name" title="Name" placeholder="Enter name (optional)" />
            <Form.TextField id="userAgent" title="User Agent" placeholder="Enter user agent (optional)" />
            <Form.TextField id="ip" title="IP Address" placeholder="Enter IP address (optional)" />
        </Form>
    );
}

function ResultView({ result }: { result: any }) {
    const markdown = `
# Email Validation Result

Valid: ${result.valid ? "Yes" : "No"}
  `;

    return <Detail markdown={markdown} />;
}