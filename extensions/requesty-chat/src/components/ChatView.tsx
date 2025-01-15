import { Action, ActionPanel, List, showToast, Toast } from '@raycast/api';
import React, { useState } from 'react';
import { ChatMessage } from '../types';
import { requestChatResponse } from '../utils/chatRequests';
import { logger } from '../utils/logger';

interface ChatViewProps {
	model: string;
}

export function ChatView({ model }: ChatViewProps) {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [inputText, setInputText] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	const handleSendMessage = async () => {
		if (!inputText.trim()) return;

		setIsLoading(true);
		logger.log('Sending message to model:', model);

		const userMessage: ChatMessage = {
			role: 'user',
			content: inputText,
			timestamp: new Date(),
		};

		setMessages((prev) => [...prev, userMessage]);
		setInputText(''); // Clear input

		try {
			const response = await requestChatResponse(inputText, model);
			logger.log('Received response from model:', model);

			const assistantMessage: ChatMessage = {
				role: 'assistant',
				content: response.content,
				model: response.model,
				timestamp: new Date(),
			};

			setMessages((prev) => [...prev, assistantMessage]);
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
	};

	return (
		<List
			isLoading={isLoading}
			searchBarPlaceholder="Type your message... (⌘ + Enter to send)"
			searchText={inputText}
			onSearchTextChange={setInputText}
			actions={
				<ActionPanel>
					<Action title="Send Message" shortcut={{ modifiers: ['cmd'], key: 'return' }} onAction={handleSendMessage} />
					<Action.CopyToClipboard
						title="Copy Conversation"
						content={messages.map((m) => `${m.role === 'user' ? 'You' : model}: ${m.content}`).join('\n\n')}
					/>
				</ActionPanel>
			}
		>
			{messages.length === 0 ? (
				<List.EmptyView
					icon="💭"
					title="Start Chatting"
					description={`Start a conversation with ${model}\nPress ⌘ + Enter to send message`}
				/>
			) : (
				messages.map((message, index) => (
					<List.Item
						key={index}
						icon={message.role === 'user' ? '👤' : '🤖'}
						title={message.content}
						subtitle={`${message.role === 'user' ? 'You' : model} • ${message.timestamp.toLocaleTimeString()}`}
						accessories={[{ text: message.role === 'user' ? 'You' : model }]}
						actions={
							<ActionPanel>
								<Action.CopyToClipboard content={message.content} />
								<Action title="Send Message" shortcut={{ modifiers: ['cmd'], key: 'return' }} onAction={handleSendMessage} />
							</ActionPanel>
						}
					/>
				))
			)}
		</List>
	);
}
