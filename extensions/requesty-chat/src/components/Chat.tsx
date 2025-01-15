import { Action, ActionPanel, Detail, Icon, List, showToast, Toast } from '@raycast/api';
import React, { useCallback, useEffect, useState } from 'react';
import { ChatMessage } from '../types';
import { requestChatResponse } from '../utils/chatRequests';
import { logger } from '../utils/logger';
import { storage } from '../utils/storage';
import { calculateCost } from '../utils/tokenCost';
import { DetailChatView } from './DetailChatView';

interface ChatProps {
	model: string;
	newChat?: boolean;
}

export function Chat({ model, newChat = false }: ChatProps) {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [inputText, setInputText] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [totalCost, setTotalCost] = useState(0);
	const [isDetailView, setIsDetailView] = useState(false);

	useEffect(() => {
		if (newChat) {
			setMessages([]);
			setTotalCost(0);
		} else {
			loadHistory();
		}
	}, [newChat, model]);

	const loadHistory = async () => {
		const history = await storage.loadChat(model);
		const totalCost = await storage.getChatCost(model);
		setMessages(history);
		setTotalCost(totalCost);
	};

	const handleSendMessage = useCallback(async () => {
		if (!inputText.trim() || isLoading) return;

		const text = inputText;
		setInputText('');
		setIsLoading(true);
		logger.log('Sending message to model:', model);

		const userMessage: ChatMessage = {
			role: 'user',
			content: text,
			timestamp: new Date(),
		};

		setMessages((prev) => [...prev, userMessage]);
		await storage.saveChat(model, [...messages, userMessage], totalCost);

		try {
			const response = await requestChatResponse(text, model);
			logger.log('Received response from model:', model);

			const costs = calculateCost(text, response.content, model);
			setTotalCost((prev) => prev + costs.total);

			const assistantMessage: ChatMessage = {
				role: 'assistant',
				content: response.content,
				model: model,
				timestamp: new Date(),
				cost: costs.total,
				inputCost: costs.inputCost,
				outputCost: costs.outputCost,
			};

			setMessages((prev) => [...prev, assistantMessage]);
			await storage.saveChat(model, [...messages, userMessage, assistantMessage], totalCost + costs.total);
		} catch (error) {
			logger.error('Error in chat:', error);
			await showToast({
				style: Toast.Style.Failure,
				title: 'Error',
				message: String(error),
			});
		} finally {
			setIsLoading(false);
		}
	}, [inputText, isLoading, messages, model, totalCost]);

	if (isDetailView) {
		return (
			<DetailChatView
				model={model}
				messages={messages}
				totalCost={totalCost}
				inputText={inputText}
				isLoading={isLoading}
				onInputChange={setInputText}
				onSendMessage={handleSendMessage}
				onSwitchView={() => setIsDetailView(false)}
				onClearChat={async () => {
					await storage.saveChat(model, [], 0);
					setMessages([]);
					setTotalCost(0);
				}}
			/>
		);
	}

	return (
		<List
			isLoading={isLoading}
			searchBarPlaceholder="Type your message..."
			searchText={inputText}
			onSearchTextChange={setInputText}
			navigationTitle={`Chat with ${model} • $${totalCost.toFixed(4)}`}
			actions={
				<ActionPanel>
					<Action
						title="Send Message"
						icon={Icon.Message}
						shortcut={{ modifiers: [], key: 'return' }}
						onAction={handleSendMessage}
					/>
					<Action
						title="Switch to Detail View"
						icon={Icon.Sidebar}
						shortcut={{ modifiers: ['cmd'], key: 'l' }}
						onAction={() => setIsDetailView(true)}
					/>
				</ActionPanel>
			}
			throttle
		>
			<List.EmptyView icon="💭" title="Start Chatting" description="Type your message above and press Enter to send" />

			{messages.map((message, index) => {
				const accessories: List.Item.Accessory[] = [
					{ text: message.timestamp.toLocaleTimeString() },
					...(message.cost ? [{ text: `$${message.cost.toFixed(4)}` }] : []),
					{
						icon: message.role === 'user' ? Icon.Person : Icon.Terminal,
						tooltip: isLoading ? 'Thinking...' : 'Ready',
					},
				];

				return (
					<List.Item
						key={index}
						icon={message.role === 'user' ? '👤' : '🤖'}
						title={message.content}
						accessories={accessories}
						actions={
							<ActionPanel>
								<ActionPanel.Section>
									<Action
										title="Send Message"
										icon={Icon.Message}
										shortcut={{ modifiers: [], key: 'return' }}
										onAction={handleSendMessage}
									/>
									<Action.Push
										title="View Details"
										icon={Icon.Sidebar}
										target={
											<Detail
												markdown={`### ${message.role === 'user' ? 'You' : 'AI'} • ${message.timestamp.toLocaleTimeString()}\n\n${message.content}`}
												metadata={
													<Detail.Metadata>
														<Detail.Metadata.Label title="Time" text={message.timestamp.toLocaleTimeString()} />
														<Detail.Metadata.Label title="Role" text={message.role === 'user' ? 'You' : 'AI'} />
														{message.cost && (
															<Detail.Metadata.Label title="Cost" text={`$${message.cost.toFixed(4)}`} />
														)}
													</Detail.Metadata>
												}
											/>
										}
										shortcut={{ modifiers: ['cmd'], key: 'y' }}
									/>
									<Action.CopyToClipboard
										title="Copy Message"
										icon={Icon.Clipboard}
										content={message.content}
										shortcut={{ modifiers: ['cmd'], key: 'c' }}
									/>
								</ActionPanel.Section>
								<ActionPanel.Section>
									<Action
										title="Clear Chat"
										icon={Icon.Trash}
										shortcut={{ modifiers: ['cmd', 'shift'], key: 'backspace' }}
										onAction={async () => {
											await storage.saveChat(model, [], 0);
											setMessages([]);
											setTotalCost(0);
										}}
									/>
								</ActionPanel.Section>
							</ActionPanel>
						}
					/>
				);
			})}
		</List>
	);
}
