import { ChatMessage } from '../types';

export async function generateMockResponse(model: string, message: string): Promise<ChatMessage> {
	// Simulate network delay
	await new Promise((resolve) => setTimeout(resolve, 1000));

	return {
		role: 'assistant',
		content: `This is a mock response from ${model} to: "${message}"`,
		model: model,
		timestamp: new Date(),
	};
}
