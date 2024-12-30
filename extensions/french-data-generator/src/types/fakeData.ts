// Types for the fake data states
type PersonName = {
  name: string;
  gender: "male" | "female";
};

type BankDetails = {
  iban: string;
  bic: string;
};

export type FakeDataState = {
  dob: string | null;
  name: PersonName | null;
  ssn: string | null;
  bankDetails: BankDetails | null;
  address: string | null;
};
