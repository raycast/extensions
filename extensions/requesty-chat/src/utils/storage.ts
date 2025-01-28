import { LocalStorage } from '@raycast/api';
import { ChatMessage } from '../types';

interface StoredChat {
	model: string;
	messages: ChatMessage[];
	lastUpdated: string;
	totalCost: number;
}

interface RecentChat {
	model: string;
	messageCount: number;
	timestamp: Date;
	totalCost: number;
}

function ensureDates(chat: StoredChat): StoredChat {
	return {
		...chat,
		messages: chat.messages.map((msg) => ({
			...msg,
			timestamp: new Date(msg.timestamp),
		})),
		lastUpdated: new Date(chat.lastUpdated).toISOString(),
	};
}

export const storage = {
	async saveChat(model: string, messages: ChatMessage[], totalCost: number) {
		const key = `requesty_chat_${model}`;
		const chat: StoredChat = {
			model,
			messages,
			lastUpdated: new Date().toISOString(),
			totalCost,
		};
		await LocalStorage.setItem(key, JSON.stringify(chat));

		// Force refresh of recent chats
		const recentKey = 'requesty_recent_chats';
		const recentChats = await this.getAllChats();
		await LocalStorage.setItem(recentKey, JSON.stringify(recentChats));
	},

	async loadChat(model: string): Promise<ChatMessage[]> {
		const stored = await this.getChatData(model);
		return (
			stored?.messages.map((msg) => ({
				...msg,
				timestamp: new Date(msg.timestamp),
			})) || []
		);
	},

	async getChatData(model: string): Promise<StoredChat | null> {
		const key = `requesty_chat_${model}`;
		const stored = await LocalStorage.getItem(key);
		if (stored) {
			return JSON.parse(stored as string);
		}
		return null;
	},

	async getChatCost(model: string): Promise<number> {
		const stored = await this.getChatData(model);
		return stored?.totalCost || 0;
	},

	async getAllChats(): Promise<RecentChat[]> {
		const allKeys = await LocalStorage.allItems();
		const chats: RecentChat[] = [];

		for (const [key, value] of Object.entries(allKeys)) {
			if (key.startsWith('requesty_chat_')) {
				try {
					const chat: StoredChat = ensureDates(JSON.parse(value as string));
					if (chat.messages.length > 0) {
						chats.push({
							model: chat.model,
							messageCount: chat.messages.length,
							timestamp: new Date(chat.lastUpdated),
							totalCost: chat.totalCost || 0,
						});
					}
				} catch (error) {
					console.error('Error parsing chat:', error);
					// Skip invalid entries
					continue;
				}
			}
		}

		const sortedChats = chats.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

		// Cache the recent chats
		await LocalStorage.setItem('requesty_recent_chats', JSON.stringify(sortedChats));

		return sortedChats;
	},

	async deleteChat(model: string): Promise<void> {
		const key = `requesty_chat_${model}`;
		await LocalStorage.removeItem(key);
	},
};
