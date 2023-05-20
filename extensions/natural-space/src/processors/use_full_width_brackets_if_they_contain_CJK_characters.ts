import { Processor } from '../orderedProcessor'
import { regex as r } from '../regex'
import { regexSourceRanges as rsr } from '../regexSource'

// ex: (你好，Tim) => （你好，Tim）
export const use_full_width_brackets_if_they_contain_CJK_characters: Processor = (input) =>
  input.replace(r.of(rsr.CJK).surroundBy('[^(]*?', '[^)]*?').wrap().surroundBy('[(]', '[)]').$(), '（$1）')
