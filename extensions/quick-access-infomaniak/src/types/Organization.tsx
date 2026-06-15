export interface Organization {
  id: number;
  name: string;
  legal_entity_type: "association" | "company" | "individual";
  created_at: number;
  website: string;
  phone: string;
  fax: string;
  beta: boolean;
  support_level: number;
  has_2fa_required: boolean;
  type: string;
  billing: boolean;
  mailing: boolean;
  billing_mailing: boolean;
  workspace_only: boolean;
  no_access: boolean;
  is_blocked: boolean;
  is_customer: boolean;
  is_sso: boolean;
}
