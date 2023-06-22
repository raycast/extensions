import { Processor } from '../createOrderedProcessor';
import { getAllHalfAndFullWidthForms } from '../fullAndHalfWidthSymbols';
import { regex as r } from '../regex';
import { regexSourceRanges as rsr } from '../regexSource';

export const no_space_before_punctuations: Processor = (input) =>
  input.replace(r.of(`${rsr.space}+`).before(r.rangeOf(getAllHalfAndFullWidthForms())._()).$(), '');
