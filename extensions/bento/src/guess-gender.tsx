import React, { useState } from "react";
import {Action, ActionPanel, Form, useNavigation, showToast, Toast, Detail} from "@raycast/api";
import { guessGender } from "./api-client";

export default function GuessGender() {
    const [isLoading, setIsLoading] = useState(false);
    const { push } = useNavigation();

    const handleSubmit = async (values: { name: string }) => {
        setIsLoading(true);
        try {
            const result = await guessGender(values.name);
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
            <Form.TextField id="name" title="Name" placeholder="Enter name to guess gender" />
        </Form>
    );
}

function ResultView({ result }: { result: any }) {
    const markdown = `
# Gender Guess Result

Gender: ${result.gender}
Confidence: ${result.confidence}
  `;

    return <Detail markdown={markdown} />;
}