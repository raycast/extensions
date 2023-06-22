// declare statically to improve performance
export const processorOrder = [
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
];
