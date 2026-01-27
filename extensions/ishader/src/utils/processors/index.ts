/**
 * Central processor registry
 * Each processor module exports both the processor function and parameter types
 */

import { processImageWithDither, DitherParams } from "./dither";
import { processImageWithAscii, AsciiParams } from "./ascii";
import { processImageWithBrick, BrickParams } from "./brick";
import { processImageWithEdit, EditParams } from "./edit";

/**
 * Processor function type
 */
export type ProcessorFunction<T = unknown> = (
  inputImagePath: string,
  params: T,
  outputPath?: string,
) => Promise<string>;

/**
 * Processor registry entry
 * paramTypes is used only as a type marker at compile time, not at runtime
 */
export interface ProcessorEntry<T = unknown> {
  processor: ProcessorFunction<T>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  paramTypes: any; // Type reference marker (only used for type inference, not runtime)
}

/**
 * Registry of all processors
 * Key: shader ID (must match config id)
 * Uses ProcessorEntry<any> to allow different parameter types in the same registry
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PROCESSOR_REGISTRY: Record<string, ProcessorEntry<any>> = {
  dither: {
    processor: processImageWithDither,
    paramTypes: {} as DitherParams,
  } as ProcessorEntry<DitherParams>,
  ascii: {
    processor: processImageWithAscii,
    paramTypes: {} as AsciiParams,
  } as ProcessorEntry<AsciiParams>,
  brick: {
    processor: processImageWithBrick,
    paramTypes: {} as BrickParams,
  } as ProcessorEntry<BrickParams>,
  edit: {
    processor: processImageWithEdit,
    paramTypes: {} as EditParams,
  } as ProcessorEntry<EditParams>,
};

// Re-export all parameter types
export type { DitherParams, AsciiParams, BrickParams, EditParams };

// Re-export all processors
export { processImageWithDither, processImageWithAscii, processImageWithBrick, processImageWithEdit };
