import { Client } from "recurly";
import { useEffect, useState } from "react";
import { TenantConfiguration } from "../TenantConfiguration";

export type UseRecurly = {
  recurly: Client;
  recurlyValid: boolean;
};

// noinspection JSUnusedGlobalSymbols
export default function useRecurly(tenant: TenantConfiguration) {
  const [state, setState] = useState<UseRecurly>({ recurlyValid: false, recurly: new Client(tenant.apiKey) });

  useEffect(() => {
    setState({ recurlyValid: tenant.name !== "", recurly: new Client(tenant.apiKey) });
  }, [tenant]);

  return state;
}
