import { getModelPricing } from './requestyClient';

export function estimateTokens(text: string): number {
	return Math.ceil(text.length / 4);
}

export interface CostBreakdown {
	inputCost: number;
	outputCost: number;
	total: number;
}

export function calculateCost(inputText: string, outputText: string, model: string): CostBreakdown {
	const pricing = getModelPricing(model);
	if (!pricing) {
		// Fallback to default prices if not found
		return {
			inputCost: 0,
			outputCost: 0,
			total: 0,
		};
	}

	const inputTokens = estimateTokens(inputText);
	const outputTokens = estimateTokens(outputText);

	const inputCost = (inputTokens / 1_000_000) * pricing.input;
	const outputCost = (outputTokens / 1_000_000) * pricing.output;

	return {
		inputCost,
		outputCost,
		total: inputCost + outputCost,
	};
}
