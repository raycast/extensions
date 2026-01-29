export type Panel = {
    id: string;
    title: string;
    virtfusion_url: string;
    api_token: string;
}

export type Server = {
    "id": string
    "name": string
    "memory": string
    "cpu": string
    storage: Array<{
      "capacity": string
    }>
    network:{ primary:{
        limit: string
        ipv4: Array<{
            address: string;
        }>
        ipv6: Array<{
            addresses: string[]
        }>
    }}
}

export type SingleResult<T> = {
    data: T;
}
export type PaginatedResult<T> = {
    data: T[];
}