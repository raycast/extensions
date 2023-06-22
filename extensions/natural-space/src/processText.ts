import { createOrderedProcessor } from './createOrderedProcessor';
import { processorOrder } from './processorOrder';
import { processors } from './processors';

const processor = createOrderedProcessor(processors, processorOrder);

// This function is expected to address 90% of the text processing needs, do NOT expect it to be perfect
// Expectations of the input:
// - Input is plain human readable text
// - Quotes and brackets are paired
// - No brackets are nested
// - Characters are mainly CJK, digits, letters, and punctuation
// - The text tend to use CJK as the primary language, that is, when full-width punctuation is applicable, it is used
// - Punctuations do not appear at the beginning of a line, except for `(` and `"` which are used to start a quote
// - No multiple punctuations appear in a row, except for `...` and `---`
export function processText(input: string, preferences: Preferences = {}): string {
  return processor(input, preferences);
}
