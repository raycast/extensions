export interface ChatMessage {
	role: 'user' | 'assistant';
	content: string;
	model?: string;
	timestamp: Date;
	cost?: number;
	inputCost?: number;
	outputCost?: number;
}

export interface ChatRequest {
	message: string;
	model: string;
}
