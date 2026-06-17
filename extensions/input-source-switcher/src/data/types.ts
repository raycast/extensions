export interface InputSourceSettings {
  id: string;
  label: string;

  kbdKeys: {
    firstRow: KeyboardRow;
    secondRow: KeyboardRow;
    thirdRow: KeyboardRow;
    fourthRow: KeyboardRow;
  };
}

export interface KeyboardRow {
  original: string;
  shift: string;
  opt: string;
  shiftOpt: string;
}
