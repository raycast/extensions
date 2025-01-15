import fetch from 'node-fetch';
import { logger } from './logger';
import { getAPIKey } from './preferences';

interface Message {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

interface ChatCompletionResponse {
	choices: {
		message: {
			content: string;
		};
	}[];
}

interface ApiModelItem {
	provider: string;
	model: string;
	input_tokens_price_per_million: number | string;
	output_tokens_price_per_million: number | string;
	updated_at: string;
}

interface ApiResponse {
	provider: string;
	model: string;
	input_tokens_price_per_million: number | string;
	output_tokens_price_per_million: number | string;
	updated_at: string;
}

let cachedModels: ApiResponse[] | null = null;

/**
 * Validates if the API key is properly set up and working
 * @returns A promise that resolves to true if the API key is valid, false otherwise
 */
export async function validateAPIKey(): Promise<boolean> {
	try {
		const apiKey = await getAPIKey();

		// If no API key is set, return false
		if (!apiKey) {
			logger.log('No API key found');
			return false;
		}

		// Try to fetch models as a validation test
		const endpoint = 'https://api.requesty.ai/router/models';
		const response = await fetch(endpoint, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
		});

		if (!response.ok) {
			logger.error('API key validation failed:', response.statusText);
			return false;
		}

		return true;
	} catch (error) {
		logger.error('API key validation error:', error);
		return false;
	}
}

/**
 * Fetches the available models from the API and caches them.
 * @returns A promise that resolves to a list of model identifiers in the format "provider/model".
 */
export async function getAvailableModels(): Promise<string[]> {
	if (cachedModels) {
		return cachedModels
			.filter((m) => {
				const inputPrice =
					typeof m.input_tokens_price_per_million === 'string'
						? parseFloat(m.input_tokens_price_per_million)
						: m.input_tokens_price_per_million;
				const outputPrice =
					typeof m.output_tokens_price_per_million === 'string'
						? parseFloat(m.output_tokens_price_per_million)
						: m.output_tokens_price_per_million;
				return inputPrice > 0 && outputPrice > 0;
			})
			.map((m) => (m.provider === 'together' ? `${m.provider}/${m.model.split('/').pop()!}` : `${m.provider}/${m.model}`));
	}

	const apiKey = await getAPIKey();
	const endpoint = 'https://api.requesty.ai/router/models';

	try {
		logger.log('Fetching models from:', endpoint);
		const response = await fetch(endpoint, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch models: ${response.statusText}`);
		}

		const text = await response.text();
		let data: ApiResponse[];

		try {
			data = JSON.parse(text);
		} catch (e) {
			logger.error('Failed to parse JSON:', e);
			throw new Error('Invalid JSON response from models API');
		}

		// Handle double-encoded JSON (if applicable)
		if (typeof data === 'string') {
			try {
				data = JSON.parse(data);
			} catch (e) {
				logger.error('Failed to parse nested JSON:', e);
				throw new Error('Invalid nested JSON format from models API');
			}
		}

		if (!Array.isArray(data)) {
			logger.error('Invalid response structure:', data);
			throw new Error('Invalid response format from models API');
		}

		logger.log('Number of models found:', data.length);
		logger.log('First 3 models:', data.slice(0, 3));

		// Validate each model object
		const isValid = data.every(
			(item: ApiModelItem) =>
				typeof item.provider === 'string' &&
				typeof item.model === 'string' &&
				(typeof item.input_tokens_price_per_million === 'number' || typeof item.input_tokens_price_per_million === 'string') &&
				(typeof item.output_tokens_price_per_million === 'number' || typeof item.output_tokens_price_per_million === 'string') &&
				typeof item.updated_at === 'string',
		);

		if (!isValid) {
			logger.error('Invalid model info structure in response:', data);
			throw new Error('Invalid model info structure from models API');
		}

		// Normalize data: ensure pricing fields are numbers
		const normalizedModels: ApiResponse[] = data.map((item: ApiModelItem) => ({
			provider: item.provider,
			model: item.model,
			input_tokens_price_per_million:
				typeof item.input_tokens_price_per_million === 'string'
					? parseFloat(item.input_tokens_price_per_million)
					: item.input_tokens_price_per_million,
			output_tokens_price_per_million:
				typeof item.output_tokens_price_per_million === 'string'
					? parseFloat(item.output_tokens_price_per_million)
					: item.output_tokens_price_per_million,
			updated_at: item.updated_at,
		}));

		// Further validate the normalized data
		const allNumbersValid = normalizedModels.every(
			(m) =>
				typeof m.input_tokens_price_per_million === 'number' &&
				!isNaN(m.input_tokens_price_per_million) &&
				typeof m.output_tokens_price_per_million === 'number' &&
				!isNaN(m.output_tokens_price_per_million),
		);

		if (!allNumbersValid) {
			logger.error('Failed to normalize pricing fields:', normalizedModels);
			throw new Error('Invalid pricing fields in models API response');
		}

		// Sort models by provider and name
		const sortedModels = normalizedModels.sort((a, b) => {
			const providerOrder: Record<string, number> = {
				anthropic: 1,
				openai: 2,
				google: 3,
				deepinfra: 4,
				together: 5, // Added 'together' to sort order
			};

			const aOrder = providerOrder[a.provider] ?? 999;
			const bOrder = providerOrder[b.provider] ?? 999;

			if (aOrder !== bOrder) return aOrder - bOrder;
			return a.model.localeCompare(b.model);
		});

		cachedModels = sortedModels;
		const modelList = sortedModels.map((m) =>
			m.provider === 'together' ? `${m.provider}/${m.model.split('/').pop()!}` : `${m.provider}/${m.model}`,
		);

		logger.log('Final model list (first 5):', modelList.slice(0, 5));
		return modelList;
	} catch (error) {
		logger.error('Failed to fetch models:', error);
		throw error;
	}
}

/**
 * Retrieves the pricing information for a given model.
 * @param model - The model identifier in the format "provider/model".
 * @returns An object containing input and output token prices, or null if the model is not found.
 */
export function getModelPricing(model: string): { input: number; output: number } | null {
	if (!cachedModels) return null;

	const [provider, modelName] = model.split('/');
	const modelInfo = cachedModels.find((m) => {
		if (m.provider === provider) {
			const actualModelName = m.model.includes('/') ? m.model.split('/').pop()! : m.model;
			const searchModelName = modelName.includes('/') ? modelName.split('/').pop()! : modelName;
			return actualModelName === searchModelName;
		}
		return m.provider === provider && m.model === modelName;
	});

	if (!modelInfo) {
		return null;
	}

	return {
		input:
			typeof modelInfo.input_tokens_price_per_million === 'string'
				? parseFloat(modelInfo.input_tokens_price_per_million)
				: modelInfo.input_tokens_price_per_million,
		output:
			typeof modelInfo.output_tokens_price_per_million === 'string'
				? parseFloat(modelInfo.output_tokens_price_per_million)
				: modelInfo.output_tokens_price_per_million,
	};
}

/**
 * Creates a chat completion using the specified model and messages.
 * @param model - The model identifier in the format "provider/model".
 * @param messages - An array of messages to send to the model.
 * @returns A promise that resolves to the assistant's reply.
 */
export async function createChatCompletion(model: string, messages: Message[]): Promise<string> {
	const apiKey = await getAPIKey();
	const endpoint = 'https://router.requesty.ai/v1/chat/completions';

	try {
		const requestBody = {
			model: model,
			messages: messages,
			temperature: 0.7,
		};

		// Masked key for logging only
		const maskedKey = `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;

		logger.log('Raw Request:', {
			endpoint,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${maskedKey}`,
			},
			body: JSON.stringify(requestBody, null, 2),
		});

		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify(requestBody),
		});

		const rawResponse = await response.text();
		logger.log('Raw Response:', rawResponse);

		if (!response.ok) {
			logger.error('API Error Response:', {
				status: response.status,
				statusText: response.statusText,
				body: rawResponse,
			});
			throw new Error(`API request failed: ${rawResponse}`);
		}

		const data = JSON.parse(rawResponse) as ChatCompletionResponse;

		logger.log('Parsed Response:', {
			status: response.status,
			headers: Object.fromEntries(response.headers.entries()),
			data: JSON.stringify(data, null, 2),
		});

		if (!data.choices || data.choices.length === 0) {
			throw new Error('No choices returned from API');
		}

		return data.choices[0].message.content;
	} catch (error) {
		logger.error('Request Failed:', {
			error: error instanceof Error ? error.stack : String(error),
			model,
			messages,
		});
		throw new Error(`Failed to get response from ${model}: ${error instanceof Error ? error.message : String(error)}`);
	}
}
