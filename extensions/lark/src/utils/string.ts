import S from 'string';

export function trimTagsAndDecodeEntities(str: string): string {
  return S(str).stripTags().decodeHTMLEntities().s;
}
