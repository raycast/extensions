import { Processor } from '../createOrderedProcessor';
import { regex as r } from '../regex';
import { regexSourceRanges as rsr } from '../regexSource';

// ex: 你好123こんにちは123안녕하세요123 => 你好 123 こんにちは 123 안녕하세요 123
export const ensure_space_between_CJK_and_digit_letters: Processor = (input) =>
  input
    .replace(r.of(rsr.CJK).wrap().before('[a-zA-Z0-9]').$(), '$1 ')
    .replace(r.of('[a-zA-Z0-9]').wrap().before(rsr.CJK).$(), '$1 ');
