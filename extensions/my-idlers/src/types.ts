type Provider = {
    id: number;
    name: string;
    created_at: string | null;
    updated_at: string | null;
}
type Location = Provider;

export type Term = 1 | 2 | 3 | 4 | 5 | 6;
type Pricing = {
    id: number
    service_id: string
    service_type: number
    active: number
    currency: "USD",
    price: string
    term: Term;
    as_usd: string
    usd_per_month: string
    next_due_date: string
    created_at: string
    updated_at: string
}

type CommonHosting = {
    id: string
    active: number
    main_domain: string;
    provider_id: number
    location_id: number
    bandwidth: number
    disk: number
    disk_type: "GB",
    disk_as_gb: number
    domains_limit: number
    subdomains_limit: number
    ftp_limit: number
    email_limit: number
    db_limit: number
    was_promo: number
    owned_since: string
    created_at: string
    updated_at: string
    location: Location;
    provider: Provider;
    price: Pricing;
    ips: string[];
    labels: [];
}
export type HostingType = "Direct Admin";
export type Reseller = CommonHosting & {
    accounts: number;
    reseller_type: HostingType;
}
export type Shared = CommonHosting & {
    shared_type: HostingType;
}