export type Integration = {
    id: string;
    name: string;
    description:string
    enabled: boolean
}

export type ListResult<T> = {
  "meta": {
    "count": number;
    "current_page":number;
  },
  "payload": T[]
}