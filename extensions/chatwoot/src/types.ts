export type Contact = {
  additional_attributes: {
    company_name: string;
  }
  email: string;
  id: number;
  name: string;
  thumbnail: string;
  created_at: number;
}
export type Conversation = {
  uuid: string;
}
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