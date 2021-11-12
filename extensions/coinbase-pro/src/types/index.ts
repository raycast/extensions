export type TStringEnum = { [key: string]: string };

export type TAccount = {
  id: string;
  currency: string;
  available: number;
};

export type TCurrency = {
  status?: string;
  id: string;
  name: string;
  details: object;
};
