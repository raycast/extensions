import { API_TOKEN, CPANEL_URL, CPANEL_USERNAME } from "./constants";
import {
  AccountDomains,
  DNSZoneRecord,
  EmailAccount,
  EmailAccountWithDiskInformation,
  SuccessResponse,
  ErrorResponse,
  Database,
} from "./types";
import { showFailureToast, useFetch } from "@raycast/utils";

type useUAPIOptions = {
  execute: boolean;
  onError?: () => void;
  onData?: () => void;
};
export function useUAPI<T>(
  module: string,
  functionName: string,
  params?: { [key: string]: string | number },
  options: useUAPIOptions = { execute: true },
) {
  const API_URL = new URL(`execute/${module}/${functionName}`, CPANEL_URL);
  if (params) Object.entries(params).forEach(([key, val]) => API_URL.searchParams.append(key, val.toString()));

  const { isLoading, data, error, revalidate } = useFetch(API_URL.toString(), {
    headers: {
      Authorization: `cpanel ${CPANEL_USERNAME}:${API_TOKEN}`,
    },
    mapResult(result: ErrorResponse | SuccessResponse<T>) {
      if (!result.status) throw result.errors;
      return {
        data: result.data,
      };
    },
    execute: options.execute,
    async onError(error) {
      await showFailureToast(error, { title: "cPanel Error" });
      options.onError?.();
    },
    onData() {
      options.onData?.();
    },
  });
  return { isLoading, data, error, revalidate };
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

// DATABASES
export const useListDatabases = (database_type: "Mysql" | "Postgresql") =>
  useUAPI<Database[]>(database_type, "list_databases");
