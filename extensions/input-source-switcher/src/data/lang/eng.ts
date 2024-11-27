import { InputSourceSettings } from "../types";

const settings: InputSourceSettings = {
  id: "eng",
  label: "🇬🇧 English",

  kbdKeys: {
    firstRow: {
      original: "`1234567890-=",
      shift: "~!@#$%^&*()_+",
      opt: "`¡™£¢∞§¶•ªº–≠",
      shiftOpt: "`⁄€‹›ﬁﬂ‡°·‚—±",
    },
    secondRow: {
      original: "qwertyuiop[]\\",
      shift: "QWERTYUIOP{}|",
      opt: "œ∑´®†¥¨ˆøπ“‘«",
      shiftOpt: "Œ„´‰ˇÁ¨∏”’»",
    },
    thirdRow: {
      original: `asdfghjkl;'`,
      shift: 'ASDFGHJKL:"',
      opt: "åß∂ƒ©˙∆˚¬…æ",
      shiftOpt: "ÅÍÎÏ˝ÓÔÒÚÆ",
    },
    fourthRow: {
      original: "zxcvbnm,./",
      shift: "ZXCVBNM<>?",
      opt: `Ω≈ç√∫˜µ≤≥÷`,
      shiftOpt: "¸˛Ç◊ı˜Â¯˘¿",
    },
  },
};

export const eng = {
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
