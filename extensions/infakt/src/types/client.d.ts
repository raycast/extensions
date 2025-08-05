import { BusinessActivityKind, PaymentMethod } from "@/types/utils";

export interface ClientObject {
  id: number;
  company_name: string;
  street?: string | null;
  street_number?: string | null;
  flat_number?: string | null;
  city?: string | null;
  country: string;
  postal_code?: string | null;
  nip?: string | null;
  phone_number?: string | null;
  same_forward_address?: boolean | null;
  web_site?: string | null;
  email?: string | null;
  note?: string | null;
  receiver?: string | null;
  mailing_company_name?: string | null;
  mailing_street?: string | null;
  mailing_city?: string | null;
  mailing_postal_code?: string | null;
  days_to_payment?: string | null;
  invoice_note?: string | null;
  payment_method?: PaymentMethod | null;
  first_name?: string | null;
  last_name?: string | null;
  business_activity_kind?: BusinessActivityKind | null;
}

export type CreateClientPayload = Pick<ClientObject, "id">;

export type UpdateClientPayload = Partial<CreateClientPayload>;

export type SetAsPaidClientPayload = Pick<ClientObject, "paid_date">;
