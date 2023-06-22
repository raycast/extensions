import { Processor } from '../createOrderedProcessor';
import { transformFullToHalfWidth } from '../fullAndHalfWidthSymbols';
import { regex as r } from '../regex';
import { regexSourceRanges as rsr } from '../regexSource';

export const no_full_width_numbers: Processor = (input) =>
  input.replace(r.of(rsr.fullWidthChars).$(), transformFullToHalfWidth);
