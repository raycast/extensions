export type Domain = {
    domain: string;
    created: string;
    expires: string;
    maxBid?: number;
}
type Nameserver = {
    nameserver: string;
    position: number;
 }
export type DomainInfo = {
    created: string;
    expires: string;
    status: "Active" | "Inactive";
    locked:"Yes" | "No",
    private:"Yes" | "No",
    auto_renew:"Yes" | "No",
    // traffic_type:"Forwarded",
    email_verification_required: "Yes" | "No",
    //   "portfolio":"Main Portfolio",
    //   "forward_url":"https://www.namesilo.net",
    //   "forward_type":"Temporary Forward (302)",
      nameservers: Nameserver[];
      contact_ids:{
         registrant: string;
         administrative: string;
         technical: string;
         billing: string;
      }
}
export type WhoisInfo = {
    domain: string;
    registered: string;
    changed: string;
    created: string;
    expires: string;
    registrar: string;
}

export type Order = {
    order_number: string;
    order_date: string;
    method: string;
    total: string;
}
export type OrderDetails = {
    description: string;
    years_qty: string;
    price: string;
    subtotal: string;
    status: string;
    credited_date?: string;
    credited_amount?: string;
}

type BaseResponse = {
    request: {
        operation: string;
        ip: string;
    }
}
export type SuccessResponse<T> = BaseResponse & {
    reply: {
        code: 300;
        detail: "success";
    } & T;
    pager?: {
     page: number;
     pageSize: number;
     total: number;
    }
}
export type ErrorResponse = BaseResponse & {
    reply: {
        code: Exclude<number, 300>;
        detail: Exclude<string, "success">;
    }
}