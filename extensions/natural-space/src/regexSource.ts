import {
  fullToHalfWidthMap as fullToHalfMap,
  fullWidthCharacterRules,
  halfToFullWidthMap as halfToFullMap,
} from './fullAndHalfWidthSymbols';
import { regex } from './regex';

export const regexSource = {
  CJK: [
    '\\u2E80-\\u2EFF', // CJK Radicals Supplement
    '\\u4e00-\\u9fa5', // Chinese characters
    '\\u3040-\\u30FF', // Japanese Hiragana and Katakana
    '\\uAC00-\\uD7AF', // Hangul Syllables
    '\\u3100-\\u312F', // Bopomofo
    '\\u3190-\\u32FF', // Kanbun
    '\\u3300-\\u3370', // Katakana Phonetic Extensions
  ].join(''),
  digits: '0-9',
  letters: 'a-zA-Z',
  pairs: [
    // '[]',
    '‘’',
    '‹›',
    '“”',
    '«»',
    '()',
    '［］',
    '{}',
    '｛｝',
    '⌈⌉',
    '⌊⌋',
    '⦃⦄',
    '⦅⦆',
    '｟｠',
    '⟅⟆',
    '⟦⟧',
    '⟨⟩',
    '⟪⟫',
    '⟬⟭',
    '⟮⟯',
    '❨❩',
    '❪❫',
    '❬❭',
    '❮❯',
    '❰❱',
    '❲❳',
    '❴❵',
    '〈〉',
    '《》',
    '「」',
    '｢｣',
    '﹁﹂',
    '『』',
    '﹃﹄',
    '【】',
    '〔〕',
    '〖〗',
    '〘〙',
    '〚〛',
    '❛❜',
    '❝❞',
  ].join(''),
  transformableHalfWidthPunctuations: Object.keys(halfToFullMap).join(''),
  transformableFullWidthPunctuations: Object.keys(fullToHalfMap).join(''),
  fullWidthChars: fullWidthCharacterRules.map(([, full]) => full).join(''),
  unit: [
    '%',
    '\u00B0',
    '\u00A2-\u00A5',
    '\u2100-\u214F',
    '\u3371-\u33DF',
    '\u2150-\u215E', // ⅐ ⅑ ⅒ ⅓ ⅔ ⅕ ⅖ ⅗ ⅘ ⅙ ⅚ ⅛ ⅜ ⅝ ⅞ ⅟
  ].join(''),
  lineBreakAndNonSpace: '\\S\\r\\n',
};

export const regexSourceRanges = {
  CJK: regex.rangeOf(regexSource.CJK)._(),
  fullWidthChars: regex.rangeOf(regexSource.fullWidthChars)._(),
  transformableHalfWidthPunctuations: regex.rangeOf(regexSource.transformableHalfWidthPunctuations)._(),
  transformableFullWidthPunctuations: regex.rangeOf(regexSource.transformableFullWidthPunctuations)._(),
  units: regex.rangeOf(regexSource.unit)._(),
  space: regex.rangeOutOf(regexSource.lineBreakAndNonSpace)._(),
};
