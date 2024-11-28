import { InputSourceSettings } from "../types";

const settings: InputSourceSettings = {
  id: "ukr",
  label: "🇺🇦 Ukrainian",

  kbdKeys: {
    firstRow: {
      original: "ґ1234567890-=",
      shift: 'Ґ!"№;%:?*()_+',
      opt: "]!@#$%^&*()–»",
      shiftOpt: `[|"£€∞¬¶√'\`—«`,
    },
    secondRow: {
      original: "йцукенгшщзхїʼ",
      shift: "ЙЦУКЕНГШЩЗХЇ₴",
      opt: "јџќ®ёњґѕў‘“ъё",
      shiftOpt: "ЈЏЌ®ЁЊҐЅЎ’”ЪЁ",
    },
    thirdRow: {
      original: `фівапролджє`,
      shift: "ФІВАПРОЛДЖЄ",
      opt: "ƒыћ÷©}°љ∆…э",
      shiftOpt: "₴ЫЋ÷©{•Љ∆…Э",
    },
    fourthRow: {
      original: "ячсмитьбю.",
      shift: "ЯЧСМИТЬБЮ,",
      opt: `ђ≈≠µи™~≤≥“`,
      shiftOpt: "Ђ≈≠µИ™~<>„",
    },
  },
};

export const ukr = {
  id: settings.id,
  label: settings.label,

  kbdKeys: [
    ...settings.kbdKeys.firstRow.original,
    ...settings.kbdKeys.secondRow.original,
    ...settings.kbdKeys.thirdRow.original,
    ...settings.kbdKeys.fourthRow.original,

    ...settings.kbdKeys.firstRow.shift,
    ...settings.kbdKeys.secondRow.shift,
    ...settings.kbdKeys.thirdRow.shift,
    ...settings.kbdKeys.fourthRow.shift,

    ...settings.kbdKeys.firstRow.opt,
    ...settings.kbdKeys.secondRow.opt,
    ...settings.kbdKeys.thirdRow.opt,
    ...settings.kbdKeys.fourthRow.opt,

    ...settings.kbdKeys.firstRow.shiftOpt,
    ...settings.kbdKeys.secondRow.shiftOpt,
    ...settings.kbdKeys.thirdRow.shiftOpt,
    ...settings.kbdKeys.fourthRow.shiftOpt,
  ].join(""),
};
