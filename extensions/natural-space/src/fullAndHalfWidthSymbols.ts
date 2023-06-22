import { memoizeLast } from './utils';

type TransformRule = [half: string, full: string, limitDirection?: 'full-to-half' | 'half-to-full' | 'both'];

// https://unicode.org/charts/PDF/UFF00.pdf
// Halfwidth and Fullwidth Forms
// Range: FF00–FFEF
const halfAndFullWidthForms: TransformRule[] = [
  ['!', '！', 'both'], // FF01 FULLWIDTH EXCLAMATION MARK
  ['"', '＂'], // FF02 FULLWIDTH QUOTATION MARK
  ['#', '＃'], // FF03 FULLWIDTH NUMBER SIGN
  ['$', '＄'], // FF04 FULLWIDTH DOLLAR SIGN
  ['%', '％'], // FF05 FULLWIDTH PERCENT SIGN
  ['&', '＆'], // FF06 FULLWIDTH AMPERSAND
  ["'", '＇'], // FF07 FULLWIDTH APOSTROPHE
  ['(', '（', 'both'], // FF08 FULLWIDTH LEFT PARENTHESIS
  [')', '）', 'both'], // FF09 FULLWIDTH RIGHT PARENTHESIS
  ['*', '＊'], // FF0A FULLWIDTH ASTERISK
  ['+', '＋'], // FF0B FULLWIDTH PLUS SIGN
  [',', '，', 'both'], // FF0C ideographic comma
  ['-', '－'], // FF0D FULLWIDTH HYPHEN-MINUS
  ['.', '．'], // FF0E FULLWIDTH FULL STOP
  ['/', '／'], // FF0F FULLWIDTH SOLIDUS

  // FF10 - FF19 FULLWIDTH DIGIT ZERO - FULLWIDTH DIGIT NINE extracted

  [':', '：', 'both'], // FF1A FULLWIDTH COLON
  [';', '；', 'both'], // FF1B FULLWIDTH SEMICOLON
  ['<', '＜'], // FF1C FULLWIDTH LESS-THAN SIGN
  ['=', '＝'], // FF1D FULLWIDTH EQUALS SIGN
  ['>', '＞'], // FF1E FULLWIDTH GREATER-THAN SIGN
  ['?', '？', 'both'], // FF1F FULLWIDTH QUESTION MARK
  ['@', '＠'], // FF20 FULLWIDTH COMMERCIAL AT

  // FF21 - FF3A FULLWIDTH LATIN CAPITAL LETTER A - FULLWIDTH LATIN CAPITAL LETTER Z extracted

  ['[', '［'], // FF3B FULLWIDTH LEFT SQUARE BRACKET
  ['\\', '＼'], // FF3C FULLWIDTH REVERSE SOLIDUS
  [']', '］'], // FF3D FULLWIDTH RIGHT SQUARE BRACKET
  ['^', '＾'], // FF3E FULLWIDTH CIRCUMFLEX ACCENT
  ['_', '＿'], // FF3F FULLWIDTH LOW LINE
  ['`', '｀'], // FF40 FULLWIDTH GRAVE ACCENT

  // FF41 - FF5A FULLWIDTH LATIN SMALL LETTER A - FULLWIDTH LATIN SMALL LETTER Z extracted

  ['{', '｛'], // FF5B FULLWIDTH LEFT CURLY BRACKET
  ['|', '｜'], // FF5C FULLWIDTH VERTICAL LINE
  ['}', '｝'], // FF5D FULLWIDTH RIGHT CURLY BRACKET
  ['~', '～'], // FF5E FULLWIDTH TILDE
  // TODO: support half-width CJK punctuation
  // ['⦅', '｟'], // FF5F FULLWIDTH LEFT WHITE PARENTHESIS
  // ['⦆', '｠'], // FF60 FULLWIDTH RIGHT WHITE PARENTHESIS
  // ['｡', '。'], // FF61 FULLWIDTH IDEOGRAPHIC FULL STOP
  // ['｢', '「'], // FF62 FULLWIDTH LEFT CORNER BRACKET
  // ['｣', '」'], // FF63 FULLWIDTH RIGHT CORNER BRACKET
  // ['､', '、'], // FF64 FULLWIDTH IDEOGRAPHIC COMMA
  ['¢', '￠'], // FFE0 FULLWIDTH CENT SIGN
  ['£', '￡'], // FFE1 FULLWIDTH POUND SIGN
  ['¬', '￢'], // FFE2 FULLWIDTH NOT SIGN
  ['¯', '￣'], // FFE3 FULLWIDTH MACRON
  ['¦', '￤'], // FFE4 FULLWIDTH BROKEN BAR
  ['¥', '￥'], // FFE5 FULLWIDTH YEN SIGN
  ['₩', '￦'], // FFE6 FULLWIDTH WON SIGN
].map(([half, full, direction = 'full-to-half']) => [half, full, direction as TransformRule[2]] as TransformRule);

const extraFullWidthPairs =
  '‘’“”' + // 201A-201D
  '〈〉《》「」『』【】〔〕〖〗〘〙〚〛﹁﹂﹃﹄'; // 3008-301E (some exclusions)
const extraFullWidthForms =
  '。、' +
  '〜' + // This is 301C, not FF5E
  extraFullWidthPairs;

export const getAllHalfWidthForms = memoizeLast(() => {
  const all = [];
  for (const [half] of halfAndFullWidthForms) all.push(half);
  return all.join('');
});

export const getAllFullWidthForms = memoizeLast(() => {
  const all = [];
  for (const [, full] of halfAndFullWidthForms) all.push(full);
  all.push(...extraFullWidthForms);
  return all.join('');
});

export const getAllHalfAndFullWidthForms = memoizeLast(() => {
  const all = [];
  all.push(...getAllFullWidthForms());
  all.push(...getAllHalfWidthForms());
  return all.join('');
});

export const fullWidthCharacterRules = [
  // FF10-FF19
  ...'０１２３４５６７８９'.split('').map((_, i) => [`${i}`, _]),

  // FF21-FF3A
  ['A', 'Ａ'], // FF21 FULLWIDTH LATIN CAPITAL LETTER A
  ['B', 'Ｂ'], // FF22 FULLWIDTH LATIN CAPITAL LETTER B
  ['C', 'Ｃ'], // FF23 FULLWIDTH LATIN CAPITAL LETTER C
  ['D', 'Ｄ'], // FF24 FULLWIDTH LATIN CAPITAL LETTER D
  ['E', 'Ｅ'], // FF25 FULLWIDTH LATIN CAPITAL LETTER E
  ['F', 'Ｆ'], // FF26 FULLWIDTH LATIN CAPITAL LETTER F
  ['G', 'Ｇ'], // FF27 FULLWIDTH LATIN CAPITAL LETTER G
  ['H', 'Ｈ'], // FF28 FULLWIDTH LATIN CAPITAL LETTER H
  ['I', 'Ｉ'], // FF29 FULLWIDTH LATIN CAPITAL LETTER I
  ['J', 'Ｊ'], // FF2A FULLWIDTH LATIN CAPITAL LETTER J
  ['K', 'Ｋ'], // FF2B FULLWIDTH LATIN CAPITAL LETTER K
  ['L', 'Ｌ'], // FF2C FULLWIDTH LATIN CAPITAL LETTER L
  ['M', 'Ｍ'], // FF2D FULLWIDTH LATIN CAPITAL LETTER M
  ['N', 'Ｎ'], // FF2E FULLWIDTH LATIN CAPITAL LETTER N
  ['O', 'Ｏ'], // FF2F FULLWIDTH LATIN CAPITAL LETTER O
  ['P', 'Ｐ'], // FF30 FULLWIDTH LATIN CAPITAL LETTER P
  ['Q', 'Ｑ'], // FF31 FULLWIDTH LATIN CAPITAL LETTER Q
  ['R', 'Ｒ'], // FF32 FULLWIDTH LATIN CAPITAL LETTER R
  ['S', 'Ｓ'], // FF33 FULLWIDTH LATIN CAPITAL LETTER S
  ['T', 'Ｔ'], // FF34 FULLWIDTH LATIN CAPITAL LETTER T
  ['U', 'Ｕ'], // FF35 FULLWIDTH LATIN CAPITAL LETTER U
  ['V', 'Ｖ'], // FF36 FULLWIDTH LATIN CAPITAL LETTER V
  ['W', 'Ｗ'], // FF37 FULLWIDTH LATIN CAPITAL LETTER W
  ['X', 'Ｘ'], // FF38 FULLWIDTH LATIN CAPITAL LETTER X
  ['Y', 'Ｙ'], // FF39 FULLWIDTH LATIN CAPITAL LETTER Y
  ['Z', 'Ｚ'], // FF3A FULLWIDTH LATIN CAPITAL LETTER Z

  // FF41-FF5A
  ['a', 'ａ'], // FF41 FULLWIDTH LATIN SMALL LETTER A
  ['b', 'ｂ'], // FF42 FULLWIDTH LATIN SMALL LETTER B
  ['c', 'ｃ'], // FF43 FULLWIDTH LATIN SMALL LETTER C
  ['d', 'ｄ'], // FF44 FULLWIDTH LATIN SMALL LETTER D
  ['e', 'ｅ'], // FF45 FULLWIDTH LATIN SMALL LETTER E
  ['f', 'ｆ'], // FF46 FULLWIDTH LATIN SMALL LETTER F
  ['g', 'ｇ'], // FF47 FULLWIDTH LATIN SMALL LETTER G
  ['h', 'ｈ'], // FF48 FULLWIDTH LATIN SMALL LETTER H
  ['i', 'ｉ'], // FF49 FULLWIDTH LATIN SMALL LETTER I
  ['j', 'ｊ'], // FF4A FULLWIDTH LATIN SMALL LETTER J
  ['k', 'ｋ'], // FF4B FULLWIDTH LATIN SMALL LETTER K
  ['l', 'ｌ'], // FF4C FULLWIDTH LATIN SMALL LETTER L
  ['m', 'ｍ'], // FF4D FULLWIDTH LATIN SMALL LETTER M
  ['n', 'ｎ'], // FF4E FULLWIDTH LATIN SMALL LETTER N
  ['o', 'ｏ'], // FF4F FULLWIDTH LATIN SMALL LETTER O
  ['p', 'ｐ'], // FF50 FULLWIDTH LATIN SMALL LETTER P
  ['q', 'ｑ'], // FF51 FULLWIDTH LATIN SMALL LETTER Q
  ['r', 'ｒ'], // FF52 FULLWIDTH LATIN SMALL LETTER R
  ['s', 'ｓ'], // FF53 FULLWIDTH LATIN SMALL LETTER S
  ['t', 'ｔ'], // FF54 FULLWIDTH LATIN SMALL LETTER T
  ['u', 'ｕ'], // FF55 FULLWIDTH LATIN SMALL LETTER U
  ['v', 'ｖ'], // FF56 FULLWIDTH LATIN SMALL LETTER V
  ['w', 'ｗ'], // FF57 FULLWIDTH LATIN SMALL LETTER W
  ['x', 'ｘ'], // FF58 FULLWIDTH LATIN SMALL LETTER X
  ['y', 'ｙ'], // FF59 FULLWIDTH LATIN SMALL LETTER Y
  ['z', 'ｚ'], // FF5A FULLWIDTH LATIN SMALL LETTER Z
];

const transformRules: TransformRule[] = halfAndFullWidthForms.concat(
  fullWidthCharacterRules.map(([half, full]) => [half, full, 'full-to-half'] as TransformRule)
);

// special rules,
// e.g. 。 maps to '.', instead of `｡`
transformRules.push(['.', '。'], [',', '，']);

export const halfToFullWidthMap = transformRules
  .filter(([, , d]) => d !== 'full-to-half')
  .reduce((acc, [half, full]) => {
    acc[half] = full;
    return acc;
  }, {} as Record<string, string>);
export const fullToHalfWidthMap = transformRules
  .filter(([, , d]) => d !== 'half-to-full')
  .reduce((acc, [half, full]) => {
    acc[full] = half;
    return acc;
  }, {} as Record<string, string>);

export const transformHalfToFullWidth = (match: string) => halfToFullWidthMap[match] || match;
export const transformFullToHalfWidth = (match: string) => fullToHalfWidthMap[match] || match;
