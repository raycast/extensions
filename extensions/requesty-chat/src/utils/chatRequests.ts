import { showToast, Toast } from '@raycast/api';
import { logger } from './logger';
import { createChatCompletion } from './requestyClient';

interface ChatResponse {
	model: string;
	content: string;
}

export async function requestChatResponse(message: string, model: string): Promise<ChatResponse> {
	try {
		const messages = [
			{ role: 'system' as const, content: 'You are a helpful AI assistant.' },
			{ role: 'user' as const, content: message },
		];

		logger.log('Sending request to Requesty:', {
			model,
			messages,
			endpoint: 'https://router.requesty.ai/v1/chat/completions',
		});

		const content = await createChatCompletion(model, messages);

		logger.log('Received response from Requesty:', {
			model,
			content,
			timestamp: new Date().toISOString(),
		});

		return {
			model,
			content,
		};
	} catch (error) {
		logger.error('Failed to get response:', error);
		await showToast({
			style: Toast.Style.Failure,
			title: 'Failed to get response',
			message: String(error),
		});
		throw error;
	}
}
