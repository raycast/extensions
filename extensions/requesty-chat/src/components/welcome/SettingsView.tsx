import { Action, ActionPanel, Form, showToast, Toast } from '@raycast/api';
import React, { useEffect, useState } from 'react';
import { getAPIKey, saveAPIKey } from '../../utils/preferences';

export function SettingsView() {
	const [apiKey, setApiKey] = useState('');

	useEffect(() => {
		loadSettings();
	}, []);

	const loadSettings = async () => {
		const key = await getAPIKey();
		setApiKey(key);
	};

	const handleSubmit = async (values: { apiKey: string }) => {
		try {
			await saveAPIKey(values.apiKey);
			await showToast({
				style: Toast.Style.Success,
				title: 'Settings saved',
			});
		} catch (error) {
			await showToast({
				style: Toast.Style.Failure,
				title: 'Failed to save settings',
				message: String(error),
			});
		}
	};

	return (
		<Form
			actions={
				<ActionPanel>
					<Action.SubmitForm title="Save Settings" onSubmit={handleSubmit} />
				</ActionPanel>
			}
		>
			<Form.PasswordField id="apiKey" title="Requesty API Key" placeholder="Enter your API key" value={apiKey} onChange={setApiKey} />
			<Form.Description text="Get your API key from requesty.ai" />
		</Form>
	);
}
