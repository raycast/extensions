export const enLayout = "`1234567890-=qwertyuiop[]\\asdfghjkl;'zxcvbnm,./";
export const enLayoutShift = '~!@#$%^&*()_+QWERTYUIOP{}|ASDFGHJKL:"ZXCVBNM<>?';

export const ukrLayout = "’1234567890-=йцукенгшщзхїєфівапролджєячсмитьбю.";
export const ukrLayoutShift = '’!"№;%:?*()_+ЙЦУКЕНГШЩЗХЇЄФІВАПРОЛДЖЄЯЧСМІТЬБЮ,';

function createMap(from: string, to: string): [string, string][] {
  return from.split("").map((char, i) => [char, to[i]]);
}

export const en_ukr = new Map<string, string>([
  ...createMap(enLayout, ukrLayout),
  ...createMap(enLayoutShift, ukrLayoutShift),
]);

export const ukr_en = new Map<string, string>([
  ...createMap(ukrLayout, enLayout),
  ...createMap(ukrLayoutShift, enLayoutShift),
]);
