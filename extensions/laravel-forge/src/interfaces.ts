export type Site = {
    id: string
    name: string,
    url: string
}

export type Server = {
    id: string
    name: string
    ip_address: string,
    url: string
    sites?: Site[]
}

export type ForgeData = {
    servers: Server[]
}
