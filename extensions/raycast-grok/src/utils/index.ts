export * from "./time";

// Vision-capable Grok models that support image inputs
export const SUPPORTED_IMAGE_INPUT_MODELS = [
  "grok-4", // Latest multimodal model (July 2025)
  "grok-2-vision-1212", // Multimodal model for documents, diagrams, charts, screenshots, and photographs
  "grok-beta", // Image understanding model for various visual information
  "grok-vision-2", // Latest vision model (December 2024)
  "grok-vision-beta", // Beta vision model
  "grok-1.5-vision", // Earlier vision model (Grok-1.5V)
];

/**
 * Check if a model supports vision/image inputs
 */
export function isVisionModel(model: string): boolean {
  return SUPPORTED_IMAGE_INPUT_MODELS.includes(model);
}
