import { Action, ActionPanel, List } from '@raycast/api';
import React, { useEffect, useState } from 'react';
import { getAvailableModels } from '../utils/requestyClient';
import { Chat } from './Chat';

export function ModelSelectionView() {
	const [models, setModels] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		loadModels();
	}, []);

	const loadModels = async () => {
		try {
			const availableModels = await getAvailableModels();
			setModels(availableModels);
		} catch (error) {
			console.error('Failed to load models:', error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<List searchBarPlaceholder="Search models..." isLoading={isLoading}>
			{models.map((model) => (
				<List.Item
					key={model}
					title={model}
					icon={model.includes('claude') ? '🟣' : model.includes('gpt') ? '🟢' : '🔵'}
					accessories={[{ text: '⌘ + Enter to chat' }]}
					actions={
						<ActionPanel>
							<Action.Push title="Start Chat" icon="💬" target={<Chat model={model} />} />
						</ActionPanel>
					}
				/>
			))}
		</List>
	);
}
