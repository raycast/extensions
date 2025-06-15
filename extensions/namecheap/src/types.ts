export type ArrOrObj<T> = T | T[];
type Domain = {
  ID: string;
  Name: string;
  User: string;
  Created: string;
  Expires: string;
  IsExpired: boolean;
  IsLocked: boolean;
  AutoRenew: boolean;
  WhoisGuard: "ENABLED" | "DISABLED" | "NOTPRESENT";
  IsPremium: boolean;
  IsOurDNS: boolean;
};
export type DomainGetListResult = {
  DomainGetListResult: {
    Domain: ArrOrObj<{
      $: Domain;
    }>;
  };
};
export type DomainDNSGetListResult = {
  DomainDNSGetListResult: {
    $: {
      Domain: string;
      IsUsingOurDNS: boolean;
      IsPremiumDNS: boolean;
      IsUsingFreeDNS: boolean;
    };
    Nameserver: string[];
  };
};
export type DomainDNSGetHostsResult = {
  DomainDNSGetHostsResult: {
    host: ArrOrObj<{
      $: {
        HostId: string;
        Name: string;
        Type: string;
        Address: string;
        MXPref: string;
        TTL: string;
        FriendlyName: string;
      };
    }>;
  };
};

export type ErrorCall = {
  ApiResponse: {
    $: {
      Status: "ERROR";
    };
    Errors: {
      Error: {
        _: string;
        $: {
          Number: string;
        };
      };
    };
    Server: string;
    GMTTimeDifference: string;
    ExecutionTime: string;
  };
};
type SuccessCall<T> = {
  ApiResponse: {
    $: {
      Status: "OK";
    };
    CommandResponse: {
      $: {
        Type: string;
      };
    } & T;
    Server: string;
    GMTTimeDifference: string;
    ExecutionTime: string;
  };
};
export type NCResponse<T> = ErrorCall | SuccessCall<T>;
