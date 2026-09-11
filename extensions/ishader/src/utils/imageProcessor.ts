/**
 * Legacy file - kept for backwards compatibility with type exports
 * All processors have been moved to src/utils/processors/
 *
 * @deprecated Import types and processors from './processors' instead
 */

// Re-export types for backwards compatibility
export type { DitherParams, AsciiParams, BrickParams } from "./processors";

// Re-export processors for backwards compatibility
export { processImageWithDither, processImageWithAscii, processImageWithBrick } from "./processors";
