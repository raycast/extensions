export interface Domain {
  id: string;
  type: "domains";
  attributes: {
    name: string;
    type: DomainType;
    hostname_status: DomainStatus;
    ssl_status: DomainStatus;
    origin_status: DomainStatus;
    redirect: DomainRedirect | null;
    last_verified_at: string | null;
    created_at: string | null;
  };
  relationships?: {
    environment?: { data: { id: string; type: string } | null };
  };
}

export type DomainType = "root" | "www" | "wildcard";
export type DomainStatus = "pending" | "verified" | "failed" | "disabled";
export type DomainRedirect = "root_to_www" | "www_to_root";
export type DomainVerificationMethod = "pre_verification" | "real_time";
