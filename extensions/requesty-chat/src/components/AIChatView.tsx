import { Action, ActionPanel, Detail, popToRoot, showToast, Toast } from '@raycast/api';
import React, { useEffect, useState } from 'react';
import { ChatMessage } from '../types';
import { requestChatResponse } from '../utils/chatRequests';
import { getAvailableModels } from '../utils/requestyClient';

interface AIChatViewProps {
	initialMessage?: string;
}

export function AIChatView({ initialMessage = '' }: AIChatViewProps) {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [selectedModels, setSelectedModels] = useState<string[]>([
		'anthropic/claude-3-5-sonnet-latest',
		'openai/gpt-4',
	]);
	const [availableModels, setAvailableModels] = useState<string[]>([]);

	useEffect(() => {
		loadModels();
		if (initialMessage) {
			handleSendMessage(initialMessage);
		}
	}, []);

	const loadModels = async () => {
		try {
			const models = await getAvailableModels();
			setAvailableModels(models);
		} catch (error) {
			console.error('Failed to load models:', error);
		}
	};

	const handleModelToggle = (model: string) => {
		setSelectedModels((prev) => {
			if (prev.includes(model)) {
				return prev.filter((m) => m !== model);
			} else {
				return [...prev, model];
			}
		});
	};

	const handleSendMessage = async (message: string) => {
		if (selectedModels.length === 0) {
			await showToast({
				style: Toast.Style.Failure,
				title: 'No models selected',
				message: 'Please select at least one model',
			});
			return;
		}

		setIsLoading(true);

		try {
			const userMessage: ChatMessage = {
				role: 'user',
				content: message,
				timestamp: new Date(),
			};

			setMessages((prev) => [...prev, userMessage]);

			const responses = await Promise.all(
				selectedModels.map(async (model) => {
					const response = await requestChatResponse(message, model);
					return {
						role: 'assistant' as const,
						content: response.content,
						model: response.model,
						timestamp: new Date(),
					};
				}),
			);

			setMessages((prev) => [...prev, ...responses]);

			await showToast({
				style: Toast.Style.Success,
				title: 'Received responses',
				message: `Got responses from ${responses.length} models`,
			});
		} catch (error) {
			await showToast({
				style: Toast.Style.Failure,
				title: 'Error getting responses',
				message: String(error),
			});
		} finally {
			setIsLoading(false);
		}
	};

	const modelSelector = `### Available Models (⌘+K to select)\n${availableModels
		.map((model) => {
			const isSelected = selectedModels.includes(model);
			return `- ${isSelected ? '✓' : '◯'} ${model}`;
		})
		.join('\n')}\n\n---\n\n`;

	const chatContent = messages
		.map((msg) => {
			const role = msg.role === 'user' ? 'You' : msg.model;
			const timestamp = msg.timestamp.toLocaleTimeString();
			return `### ${role} (${timestamp})\n${msg.content}\n`;
		})
		.join('\n---\n\n');

	return (
		<Detail
			markdown={modelSelector + chatContent || 'Press ⌘+K to select models and start chatting'}
			isLoading={isLoading}
			actions={
				<ActionPanel>
					<ActionPanel.Section>
						<Action
							title="Send Message"
							shortcut={{ modifiers: ['cmd'], key: 'return' }}
							onAction={async () => {
								try {
									await showToast({
										style: Toast.Style.Animated,
										title: 'Enter your message in the search bar',
									});
									await popToRoot();
								} catch (error) {
									console.error('Error:', error);
								}
							}}
						/>
					</ActionPanel.Section>
					<ActionPanel.Section title="Models">
						{availableModels.map((model) => (
							<Action
								key={model}
								title={`${selectedModels.includes(model) ? '✓ ' : ''}${model}`}
								onAction={() => handleModelToggle(model)}
							/>
						))}
					</ActionPanel.Section>
					<ActionPanel.Section>
						<Action.CopyToClipboard content={chatContent} title="Copy Conversation" />
					</ActionPanel.Section>
				</ActionPanel>
			}
		/>
	);
}
