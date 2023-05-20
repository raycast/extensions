import { findProcessorOrder } from './findProcessorOrder'
import { createOrderedProcessor } from './orderedProcessor'
import { Preferences } from './Preferences'
import { processors } from './processors/processors'

const processorOrder =
  [
    'no full-width numbers',
    'no space before punctuations',
    'no duplicated whitespace, except leading and trailing ones',
    'use full-width brackets if they contain CJK characters',
    'use full-width quotes if they contain CJK characters',
    'ensure space between CJK and digit/letters',
    'ensure space between numbers and units (exclude exceptions)',
    'add space after units',
    'no space between CJK',
    'use preferred full-width quotes',
    'use full-width punctuation around CJK characters',
    'ensure space before left brackets',
    'use half-width punctuation between CJK brackets if no CJK found',
    'no space around full-width punctuation',
    'ensure space after some half-width punctuations',
    'ensure space around some half-width punctuations',
  ] || findProcessorOrder(processors)
const processor = createOrderedProcessor(processors, processorOrder)

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
  return processor(input, preferences)
}
