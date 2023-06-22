import { MetaProcessorRecord, Processor, ProcessorRecord } from '../createOrderedProcessor';
import { add_space_after_units } from './add_space_after_units';
import { ensure_space_after_some_half_width_punctuations } from './ensure_space_after_some_half_width_punctuations';
import { ensure_space_around_some_half_width_punctuations } from './ensure_space_around_some_half_width_punctuations';
import { ensure_space_before_left_brackets } from './ensure_space_before_left_brackets';
import { ensure_space_between_CJK_and_digit_letters } from './ensure_space_between_CJK_and_digit_letters';
import { ensure_space_between_numbers_and_units_exclude_exceptions } from './ensure_space_between_numbers_and_units_exclude_exceptions';
import { no_full_width_numbers } from './no full-width numbers';
import { no_space_before_punctuations } from './no space before punctuations';
import { no_duplicated_whitespace_except_leading_and_trailing_ones } from './no_duplicated_whitespace_except_leading_and_trailing_ones';
import { no_space_around_full_width_punctuation } from './no_space_around_full_width_punctuation';
import { no_space_between_CJK } from './no_space_between_CJK';
import { use_full_width_brackets_if_they_contain_CJK_characters } from './use_full_width_brackets_if_they_contain_CJK_characters';
import { use_full_width_punctuation_around_CJK_characters } from './use_full_width_punctuation_around_CJK_characters';
import { use_full_width_quotes_if_they_contain_CJK_characters } from './use_full_width_quotes_if_they_contain_CJK_characters';
import { use_half_width_punctuation_between_CJK_brackets_if_no_CJK_found } from './use_half_width_punctuation_between_CJK_brackets_if_no_CJK_found';
import { use_preferred_full_width_quotes } from './use_preferred_full_width_quotes';

const _processors: Record<string, Processor> = {
  'no full-width numbers': no_full_width_numbers,
  'no space before punctuations': no_space_before_punctuations,
  'no duplicated whitespace, except leading and trailing ones':
    no_duplicated_whitespace_except_leading_and_trailing_ones,
  'use full-width brackets if they contain CJK characters': use_full_width_brackets_if_they_contain_CJK_characters,
  'use full-width quotes if they contain CJK characters': use_full_width_quotes_if_they_contain_CJK_characters,
  'use preferred full-width quotes': use_preferred_full_width_quotes,
  'use full-width punctuation around CJK characters': use_full_width_punctuation_around_CJK_characters,
  'ensure space before left brackets': ensure_space_before_left_brackets,
  'use half-width punctuation between CJK brackets if no CJK found':
    use_half_width_punctuation_between_CJK_brackets_if_no_CJK_found,
  'no space around full-width punctuation': no_space_around_full_width_punctuation,
  'ensure space between CJK and digit/letters': ensure_space_between_CJK_and_digit_letters,
  'ensure space between numbers and units (exclude exceptions)':
    ensure_space_between_numbers_and_units_exclude_exceptions,
  'add space after units': add_space_after_units,
  'ensure space after some half-width punctuations': ensure_space_after_some_half_width_punctuations,
  'ensure space around some half-width punctuations': ensure_space_around_some_half_width_punctuations,
  'no space between CJK': no_space_between_CJK,
};

export const processors: ProcessorRecord[] = (
  [
    ['no full-width numbers'],
    ['no space before punctuations'],
    ['no duplicated whitespace, except leading and trailing ones'],
    ['use full-width brackets if they contain CJK characters'],
    ['use full-width quotes if they contain CJK characters'],
    ['ensure space between CJK and digit/letters'],
    ['ensure space between numbers and units (exclude exceptions)'],
    ['add space after units'],
    ['no space between CJK'],
    ['use preferred full-width quotes', ['use full-width quotes if they contain CJK characters']],
    ['use full-width punctuation around CJK characters', ['no space before punctuations']],
    [
      'ensure space before left brackets',
      ['use full-width punctuation around CJK characters', 'use full-width brackets if they contain CJK characters'],
    ],
    [
      'use half-width punctuation between CJK brackets if no CJK found',
      ['use full-width punctuation around CJK characters'],
    ],
    ['no space around full-width punctuation', ['use full-width punctuation around CJK characters']],
    [
      'ensure space after some half-width punctuations',
      ['use half-width punctuation between CJK brackets if no CJK found'],
    ],
    [
      'ensure space around some half-width punctuations',
      ['use half-width punctuation between CJK brackets if no CJK found'],
    ],
  ] as MetaProcessorRecord[]
).map(([name, dependencies]) => [name, _processors[name], dependencies]);
