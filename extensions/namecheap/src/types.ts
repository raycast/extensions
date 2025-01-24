export type ArrOrObj<T> = T | T[];
type Domain = {
    ID: string;
    Name: string;
    User: string;
    Created: string;
    Expires: string;
    IsExpired: "true" | "false";
    IsLocked: "true" | "false";
    AutoRenew: "true" | "true";
    WhoisGuard: "ENABLED" | "DISABLED";
    IsPremium: "true" | "false";
    IsOurDNS: "true" | "false";
}
export type DomainGetListResult = {
    DomainGetListResult: {
        Domain: ArrOrObj<{
            $: Domain;
        }>
    }
}

export type ErrorCall = {
    ApiResponse: {
        $: {
        Status: "ERROR";
    }
    Errors: {
        Error: {
            _: string;
            $: {
                Number: string;
            }
        }
    }
    Server: string;
        GMTTimeDifference: string;
        ExecutionTime: string;
}
}
type SuccessCall<T> = {
    ApiResponse: {
        $: {
            Status: "OK";
        }
        CommandResponse: {
            $: {
                Type: string;
            };
        } & T;
    Server: string;
        GMTTimeDifference: string;
        ExecutionTime: string;
}
}
export type NCResponse<T> = ErrorCall | SuccessCall<T>;