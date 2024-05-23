import { ActionPanel, Action, Form, showToast, Toast } from '@raycast/api';
import { useState } from 'react';
import fetch from 'node-fetch';

type OtsRequest = {
    secret: string;
    passphrase?: string;
};

/**
 * Create a One-Time Secret via API
 *
 * @param {string} secret
 * @param {string} [passphrase]
 * @return {*}  {(Promise<string | null>)}
 */
const createOts = async (secret: string, passphrase?: string): Promise<string | null> => {
    if (!secret) {
        showToast(Toast.Style.Failure, 'Secret is required');
        return null;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: 'Creating One-Time Secret' });

    const response = await fetch('https://www.mindtwo.de/api/ots', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            secret,
            passphrase,
        }),
    });

    if (!response.ok) {
        toast.style = Toast.Style.Failure;
        toast.title = `Failed to create One-Time Secret (Error ${response.status})`;
        return null;
    }

    const url = await response.text();

    // check if url is valid
    if (!url || !url.startsWith('https://www.mindtwo.de/ots/')) {
        toast.style = Toast.Style.Failure;
        toast.title = 'Failed to create One-Time Secret';
        return null;
    }

    toast.style = Toast.Style.Success;
    toast.title = 'One-Time Secret created';

    return url;
};

export default function Command() {
    const [otsUrl, setOtsUrl] = useState<null | string>(null);

    // submit form
    const handleSubmit = async (values: OtsRequest) => {
        const response = await createOts(values.secret, values.passphrase);

        setOtsUrl(response);
    };

    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm
                        title="Create"
                        shortcut={{ modifiers: ['cmd'], key: 'enter' }}
                        onSubmit={handleSubmit}
                    />

                    {otsUrl && (
                        <ActionPanel.Section title="One-Time Secret Actions">
                            <Action.CopyToClipboard
                                content={otsUrl}
                                shortcut={{ modifiers: ['cmd'], key: '.' }}
                            />
                            <Action.OpenInBrowser
                                url={otsUrl}
                                shortcut={{ modifiers: ['cmd', 'shift'], key: '.' }}
                            />
                        </ActionPanel.Section>
                    )}
                </ActionPanel>
            }
        >
            <Form.TextArea id="secret" title="Secret" placeholder="Enter your secret" />
            <Form.TextField id="passphrase" title="Passphrase" placeholder="Enter your passphrase (optional)" />
        </Form>
    );
}
