import { Action, ActionPanel, Icon, List } from '@raycast/api';
import React, { useEffect, useState } from 'react';
import { logger } from '../../utils/logger';
import { storage } from '../../utils/storage';
import { Chat } from '../Chat';

interface RecentChat {
	model: string;
	messageCount: number;
	timestamp: Date;
	totalCost: number;
}

export function RecentChats() {
	const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		loadRecentChats();
	}, []);

	const loadRecentChats = async () => {
		try {
			setIsLoading(true);
			setError(null);
			logger.log('Loading recent chats...');
			const chats = await storage.getAllChats();
			logger.log('Loaded chats:', chats);

			// Ensure timestamps are properly converted to Date objects
			const processedChats = chats.map((chat) => ({
				...chat,
				timestamp: new Date(chat.timestamp),
			}));

			setRecentChats(processedChats);
		} catch (err) {
			logger.error('Error loading recent chats:', err);
			setError(err instanceof Error ? err.message : 'Failed to load recent chats');
		} finally {
			setIsLoading(false);
		}
	};

	if (error) {
		return <List.Item icon={Icon.ExclamationMark} title="Error loading chats" subtitle={error} />;
	}

	if (recentChats.length === 0 && !isLoading) {
		return (
			<List.Item
				icon={Icon.Message}
				title="No recent chats"
				accessories={[{ text: 'Start a new chat to get going!' }]}
			/>
		);
	}

	return recentChats.map((chat) => (
		<List.Item
			key={`${chat.model}-${chat.timestamp.toISOString()}`}
			icon={getModelIcon(chat.model)}
			title={getModelDisplayName(chat.model)}
			subtitle={`${chat.messageCount} messages`}
			accessories={[{ text: `$${chat.totalCost.toFixed(4)}` }, { text: chat.timestamp.toLocaleString() }]}
			actions={
				<ActionPanel>
					<Action.Push title="Continue Chat" target={<Chat model={chat.model} />} />
					<Action
						title="Delete Chat"
						icon={Icon.Trash}
						onAction={async () => {
							await storage.deleteChat(chat.model);
							await loadRecentChats();
						}}
					/>
				</ActionPanel>
			}
		/>
	));
}

function getModelIcon(model: string): Icon {
	if (model.includes('claude')) return Icon.Stars;
	if (model.includes('gpt')) return Icon.LightBulb;
	return Icon.Terminal;
}

function getModelDisplayName(model: string): string {
	return model
		.split('/')[1]
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}
