import React, { useState } from "react";
import {Action, ActionPanel, Form, useNavigation, showToast, Toast, Detail} from "@raycast/api";
import { checkBlacklist } from "./api-client";

export default function CheckBlacklist() {
    const [isLoading, setIsLoading] = useState(false);
    const { push } = useNavigation();

    const handleSubmit = async (values: { domain?: string; ip?: string }) => {
        setIsLoading(true);
        try {
            const result = await checkBlacklist(values.domain, values.ip);
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
            <Form.TextField id="domain" title="Domain" placeholder="Enter domain to check" />
            <Form.TextField id="ip" title="IP Address" placeholder="Enter IP address to check" />
        </Form>
    );
}

function ResultView({ result }: { result: any }) {
    const markdown = `
# Blacklist Check Result

- Query: ${result.query}
- Description: ${result.description}

## Results
${Object.entries(result.results)
        .map(([key, value]) => `- ${key}: ${String(value)}`)
        .join("\n")}
  `;

    return <Detail markdown={markdown} />;
}