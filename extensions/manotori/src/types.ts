enum RENEWAL_MODE {
  RENEWAL = "RENEWAL",
  EXPIRE = "EXPIRE",
  DELETE = "DELETE",
}
export enum TRANSFER_LOCK {
  LOCKED = "LOCKED",
  UNLOCKED = "UNLOCKED",
}
export type Domain = {
  domain_id: number;
  domain: string;
  status: string;
  expire_at: string;
  renewal_mode: RENEWAL_MODE;
  renewal_at: string;
  transfer_lock: TRANSFER_LOCK | null;
  zone_id: number | null;
  nameserver_set_id: number;
};
export type DomainDetails = Omit<Domain, "zone_id"> & {
  tld: string;
  registered_at: string | null;
  transferred_at: string | null;
  auth_code: string;
  auth_code_expire_at: string | null;
  owner_contact_handle_id: number;
  admin_contact_handle_id: number;
  tech_contact_handle_id: number | null;
  zone_contact_handle_id: number | null;
  is_dnssec_active: 0 | 1;
  glue_records: string[] | null;
};

export type DNSZone = {
  zone_id: number
  zone: string;
  status: "ACTIVE" | "INACTIVE";
  ns_resource_records: string;
}
export type DNSRecord = {
    zone_id: number;
    dns_record_id: number;
    zone: string;
    name: string;
    type: string;
    content: string;
    ttl: number;
    prio: number;
  }

export type DomainEvent = {
  domain: string;
  status: string;
  notification_code: number;
  created_at: string;
};

export type NameserverSet = {
  nameserver_set_id: number;
  provider_id: number | null;
  name: string;
  type: "INTERNAL" | "EXTERNAL";
  nameservers: Array<{
    nameserver: string;
  }>;
  is_editable: 0 | 1;
  is_deletable: 0 | 1;
  is_deprecated: 0 | 1;
};

export type ErrorResponse = {
  data:
    | []
    | {
        code: number;
        file: string;
        line: number;
      };
  msg: string;
  msg_key: null;
};
export type SuccessResult<T> = {
  data: T;
  msg: string | null;
  msg_key: null;
};
