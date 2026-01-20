export type OrderDomainModel = {
      "type": "domain",
      "domain": {
        "name": string
        "registrant": string
        "admin": string
        "tech": string
        "billing": string
        "ns": string[]
      },
      "oid": string
      "status": string[]
      "cts": number
      "uts": number
      "ets": number
}

export type Contact = {
    "contactId": string
    "firstName": string
    "middleName"?: string
    "lastName": string
    "org"?: string
    "orgPhone"?: string
    "cc": string
    "pc": string
    "sp": string
    "city": string
    "addr": string
    "email": string
    "phone": string
    "phonePolicy": boolean,
    "fax"?: string
}