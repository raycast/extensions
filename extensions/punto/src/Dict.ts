export const enLayout =
  "`1234567890-=~!@#$%^&*()_+qwertyuiop[]\\QWERTYUIOP{}|asdfghjkl;'ASDFGHJKL:\"zxcvbnm,./ZXCVBNM<>?";
export const ruLayout =
  ']1234567890-=[!"№%:,.;()_+йцукенгшщзхъёЙЦУКЕНГШЩЗХЪЁфывапролджэФЫВАПРОЛДЖЭячсмитьбю/ЯЧСМИТЬБЮ?';
export const ruPhoneticLayout =
  "ё1234567890-=Ё!@#$%^&*()_+яшертыуиопющэЯШЕРТЫУИОПЮЩЭасдфгчйкльжАСДФГЧЙКЛЬЖзхцвбнм,./ЗХЦВБНМ<>?";
export const ukPhoneticLayout =
  "ґ1234567890-їҐ!@#$%^&*()_ЇяшертиуіопющєЯШЕРТИУІОПЮЩЄасдфгчйкльжАСДФГЧЙКЛЬЖзхцвбнм,./ЗХЦВБНМ<>?";

function generateMap(source: string, target: string): Map<string, string> {
  const map = new Map<string, string>();
  for (let i = 0; i < source.length; i++) {
    if (source[i] !== target[i]) {
      map.set(source[i], target[i]);
    }
  }
  return map;
}

export const ru_en = generateMap(ruLayout, enLayout);
export const en_ru = generateMap(enLayout, ruLayout);

export const ru_en_phonetic = generateMap(ruPhoneticLayout, enLayout);
export const en_ru_phonetic = generateMap(enLayout, ruPhoneticLayout);

export const uk_en_phonetic = generateMap(ukPhoneticLayout, enLayout);
export const en_uk_phonetic = generateMap(enLayout, ukPhoneticLayout);
