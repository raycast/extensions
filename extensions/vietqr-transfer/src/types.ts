export interface Bank {
  bin: string;
  shortName: string;
}

export interface FormValues {
  account: string;
  amount: string;
  memo: string;
  template: string;
}
