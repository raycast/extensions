export type Domain = {
    id: number
    name: string
    date_expiration: number | null
}
export enum DNSRecordType {
    A = "A",
    AAAA = "AAAA",
    ALIAS = "ALIAS",
    CAA = "CAA",
    CNAME = "CNAME",
    DS = "DS",
    MX = "MX",
    NS = "NS",
    PTR = "PTR",
    SOA = "SOA",
    SRV = "SRV",
    TXT = "TXT"
}
export type DNSRecord = {
    id: number;
    type: DNSRecordType
    name: string;
    value: string
    annotation: string
}
export type DNSRecordForm = Omit<DNSRecord, "id" | "type"> & {
    type: string
    domain: number
}

export type ErrorResult = string | {
    [field: string]: string[]
}