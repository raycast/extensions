export type Domain = {
    id: number
    name: string
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
}

export type ErrorResult = string | {
    [field: string]: string[]
}