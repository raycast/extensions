export type Alias = {
    alias: string;
    created: number
    forward: string;
    id: number;
}
export type Domain = {
    active: boolean;
    added: number;
    aliases: Alias[];
    banned: boolean;
    daily_quota?: number;
    display: string;
    dkim_selector: string;
    domain: string;
    notification_email: string | null;
    strict_mxes: boolean;
    webhook: null;
    whitelabel: null;
}

type DomainLogEvent = {
    code: number;
    created: number;
    id: string;
    local: string;
    message: string;
    recipient: {
        email: string;
        name: string | null;
    }
    server: string;
    status: "DELIVERED" | "QUEUED";
}
export type DomainLog = {
    created: number;
    created_raw: number;
    events: DomainLogEvent[];
      forward: {
        email: string;
        name: string | null
      }
      hostname: string;
      id: string;
      messageId: string;
      recipient: {
        email: string;
        name: string | null;
      }
      saved: boolean;
      sender: {
        email: string;
        name: string | null;
      }
      subject: string;
      transport: string;
      url: string;
}

export type ErrorResponse = {
    code: number;
    success: false;
} & (
    | { error: string; errors?: never }
    | { error?: never; errors: string[] }
);