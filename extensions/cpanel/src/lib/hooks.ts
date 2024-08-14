import { API_TOKEN, CPANEL_URL, CPANEL_USERNAME } from "./constants";
import {
  AccountDomains,
  DNSZoneRecord,
  EmailAccount,
  EmailAccountWithDiskInformation,
  SuccessResponse,
  ErrorResponse,
} from "./types";
import { useFetch } from "@raycast/utils";

function useUAPI<T>(module: string, functionName: string, params?: { [key: string]: string | number }) {
  try {
    const API_URL = new URL(`execute/${module}/${functionName}`, CPANEL_URL);
    if (params) Object.entries(params).forEach(([key, val]) => API_URL.searchParams.append(key, val.toString()));

    const { isLoading, data, error } = useFetch(API_URL.toString(), {
      headers: {
        Authorization: `cpanel ${CPANEL_USERNAME}:${API_TOKEN}`,
      },
      mapResult(result: ErrorResponse | SuccessResponse<T>) {
        if (!result.status) throw result.errors;
        return {
          data: result.data,
        };
      },
    });
    return { isLoading, data, error };
  } catch (error) {
    return { isLoading: false, data: undefined, error };
  }
}

// DOMAINS
export const useListDomains = () => useUAPI<AccountDomains>("DomainInfo", "list_domains");
export const useParsedDNSZone = (zone: string) => {
  const { data, ...rest } = useUAPI<DNSZoneRecord[]>("DNS", "parse_zone", { zone });
  if (data) {
    const filteredData = data.filter((item): item is DNSZoneRecord & { type: "record" } => item.type === "record");
    // decode from base64
    const parsedData = filteredData.map((item) => {
      return { ...item, dname: atob(item.dname_b64), data: item.data_b64.map((d) => atob(d)) };
    });
    return { data: parsedData, ...rest };
  }
  return { data, ...rest };
};

// EMAILS
export const useListEmailAccounts = () => useUAPI<EmailAccount[]>("Email", "list_pops", { skip_main: 1 });
export const useListEmailAccountsWithDiskInfo = (email: string, domain: string) =>
  useUAPI<EmailAccountWithDiskInformation[]>("Email", "list_pops_with_disk", {
    email,
    domain,
    maxaccounts: 1,
    novalidate: 1,
  });
