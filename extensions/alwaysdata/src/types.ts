export type Domain = {
    id: number
    name: string
    date_expiration: number | null
}
export type DNSRecord = {
    id: number;
    type: "A"
|"AAAA"
|"ALIAS"
|"CAA"
|"CNAME"
|"DS"
|"MX"
|"NS"
|"PTR"
|"SOA"
|"SRV"
|"TXT"
name: string;
value: string
}

export type ErrorResult = string | {
    [field: string]: string[]
}