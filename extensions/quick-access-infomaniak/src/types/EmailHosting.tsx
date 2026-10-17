import { Tag } from "./Tag";

export interface EmailHosting {
  id: number;
  account_id: number;
  service_id: number;
  service_name: string;
  customer_name: string;
  internal_name: string | null;
  created_at: number;
  expired_at: number;
  version: number;
  has_maintenance: boolean;
  is_locked: boolean;
  has_operation_in_progress: boolean;
  tags: Tag[];
  unique_id: number;
  description: string;
  is_free: boolean;
  is_zero_price: boolean;
  is_trial: boolean;
  rights: {
    technical: boolean;
  };
}
