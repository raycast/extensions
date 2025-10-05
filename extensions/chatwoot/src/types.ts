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
type Message = {
  content: string
}
export type Conversation = {
  meta: {
    sender: {
      name: string;
    }
  }
  id: number;
  messages: Message[]
  "created_at": number
  "last_activity_at": number
}
export type Inbox = {
  id: number;
  avatar_url: string;
  name: string
  channel_type: string
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