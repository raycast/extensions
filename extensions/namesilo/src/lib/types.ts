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
        code: string;
        detail: string;
    }
}