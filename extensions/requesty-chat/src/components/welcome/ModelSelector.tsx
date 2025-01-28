import { Action, ActionPanel, Icon, List, openExtensionPreferences, showToast, Toast } from '@raycast/api';
import React, { useEffect, useState } from 'react';
import { logger } from '../../utils/logger';
import { getAvailableModels, getModelPricing, validateAPIKey } from '../../utils/requestyClient';
import { Chat } from '../Chat';

interface ModelSelectorProps {
	showNewChatOnly?: boolean;
}

export function ModelSelector({ showNewChatOnly = false }: ModelSelectorProps) {
	const [models, setModels] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		loadModels();
	}, []);

	const loadModels = async () => {
		try {
			logger.log('Starting to load models...');
			const availableModels = await getAvailableModels();
			logger.log('Received models:', availableModels);
			setModels(availableModels);
			logger.log('Models set in state');
		} catch (error) {
			logger.error('Failed to load models:', error);
			await showToast({
				style: Toast.Style.Failure,
				title: 'Failed to load models',
				message: String(error),
			});
			setModels([]);
		} finally {
			setIsLoading(false);
			logger.log('Loading state set to false');
		}
	};

	const renderModelItems = () => {
		return models
			.map((model) => {
				const pricing = getModelPricing(model);

				// Skip rendering if no pricing is available
				if (!pricing) return null;

				return (
					<List.Item
						key={model}
						icon={getModelIcon(model)}
						title={getModelDisplayName(model)}
						accessories={
							[
								{
									text: `$${pricing.input}/M in • $${pricing.output}/M out`,
								},
								{ text: showNewChatOnly ? 'Start New Chat' : 'Configure or Chat' },
							].filter(Boolean) as List.Item.Accessory[]
						}
						actions={
							<ActionPanel>
								<ActionPanel.Section>
									<Action.Push
										title="Start New Chat"
										icon={Icon.Message}
										target={<Chat model={model} newChat={true} />}
										onPush={async () => {
											const isValid = await validateAPIKey();
											if (!isValid) {
												await showToast({
													style: Toast.Style.Failure,
													title: 'API Key Not Configured',
													message: 'Please set up your API key in preferences',
												});
												await openExtensionPreferences();
												return false; // Prevent navigation
											}
											return true; // Allow navigation
										}}
									/>
								</ActionPanel.Section>
							</ActionPanel>
						}
					/>
				);
			})
			.filter(Boolean); // Remove null items
	};

	return (
		<List navigationTitle="Select Requesty Model" isLoading={isLoading}>
			<List.Section title="Available Models">{renderModelItems()}</List.Section>
		</List>
	);
}

function getModelIcon(model: string): Icon {
	if (model.includes('claude')) return Icon.Stars;
	if (model.includes('gpt')) return Icon.LightBulb;
	if (model.includes('gemini')) return Icon.Globe;
	return Icon.Terminal;
}

function getModelDisplayName(model: string): string {
	return model.split('/')[1];
}
