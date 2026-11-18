export type NifRecord = {
  nif: string;
  name: string;
  is_active: boolean;
  legal_regime: string | null;
  share_capital: number | null;
  start_date: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address_full: string | null;
  zip_code: string | null;
  city: string | null;
  cae_list: string[] | null;
  updated_at: string;
};

export type NifResponse = NifRecord;
