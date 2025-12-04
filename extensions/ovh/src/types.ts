export type Domain = {
  domain: string;
  dnssecState: "disabled" | "enabled" | "not_supported";
  nameServerType: "anycast" | "dedicated" | "empty" | "external" | "hold" | "hosted" | "hosting" | "mixed" | "parking";
  nameServers: Array<{ nameServer: string }>;
  renewalDate: string;
  renewalState: "automatic_renew" | "cancellation_complete" | "cancellation_requested" | "manual_renew" | "unpaid";
  serviceId: number;
  state:
    | "autorenew_in_progress"
    | "autorenew_registry_in_progress"
    | "deleted"
    | "dispute"
    | "expired"
    | "ok"
    | "outgoing_transfer"
    | "pending_create"
    | "pending_delete"
    | "pending_incoming_transfer"
    | "pending_installation"
    | "registry_suspended"
    | "restorable"
    | "technical_suspended";
  transferLockStatus: "locked" | "locking" | "unavailable" | "unlocked" | "unlocking";
};
export type DNSRecord = {
  fieldType:
    | "A"
    | "AAAA"
    | "CAA"
    | "CNAME"
    | "DKIM"
    | "DMARC"
    | "DNAME"
    | "LOC"
    | "MX"
    | "NAPTR"
    | "NS"
    | "PTR"
    | "RP"
    | "SPF"
    | "SRV"
    | "SSHFP"
    | "TLSA"
    | "TXT";
  id: number;
  subDomain: string | null;
  target: string;
  ttl: number | null;
  zone: string;
};
