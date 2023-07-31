export type Language = "ukr" | "eng";

export const kbdKeys: Record<Language, string> = {
  eng: `qwertyuiop[]\\asdfghjkl;'zxcvbnm,./\`QWERTYUIOP{}|ASDFGHJKL:"ZXCVBNM<>?~!@#$%^&*()_+`,
  ukr: `йцукенгшщзхїʼфівапролджєячсмитьбю.ґЙЦУКЕНГШЩЗХЇ₴ФІВАПРОЛДЖЄЯЧСМИТЬБЮ,Ґ!"№;%:?*()_+`,
};
