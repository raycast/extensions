import { Processor } from '../createOrderedProcessor';
import { regex as r } from '../regex';
import { regexSourceRanges as rsr } from '../regexSource';

// ex: 你 好 => 你好
export const no_space_between_CJK: Processor = (input) =>
  input.replace(r.of(rsr.space).repeat().nextTo(rsr.CJK, { bothSides: true }).$(), '');
