import { API_TOKEN, CPANEL_URL, CPANEL_USERNAME } from "./constants";
import {
  AccountDomains,
  DNSZoneRecord,
  EmailAccount,
  EmailAccountWithDiskInformation,
  SuccessResponse,
  ErrorResponse,
  Database,
  FileItem,
  FileContent,
  AccountConfiguration,
  Usage,
  FTPAccountWithDiskInformation,
  APIToken,
} from "./types";
import { showFailureToast, useFetch } from "@raycast/utils";

type useUAPIOptions<T> = {
  execute: boolean;
  onError?: () => void;
  onData?: (data: T) => void;
};
export function useUAPI<T>(
  module: string,
  functionName: string,
  params?: Record<string, string | number>,
  options: useUAPIOptions<T> = { execute: true },
) {
  const API_URL = new URL(`execute/${module}/${functionName}`, CPANEL_URL);
  if (params) Object.entries(params).forEach(([key, val]) => API_URL.searchParams.append(key, val.toString()));

  const { isLoading, data, error, revalidate } = useFetch(API_URL.toString(), {
    headers: {
      Authorization: `cpanel ${CPANEL_USERNAME}:${API_TOKEN}`,
    },
    mapResult(result: ErrorResponse | SuccessResponse<T>) {
      if (!result.status) throw new Error(result.errors.join());
      return {
        data: result.data,
      };
    },
    execute: options.execute,
    async onError(error) {
      await showFailureToast(error, { title: "cPanel Error" });
      options.onError?.();
    },
    onData(data) {
      options.onData?.(data);
    },
  });
  return { isLoading, data, error, revalidate };
}

// ACCOUNTS
export const useGetAccountConfiguration = () => useUAPI<AccountConfiguration>("Variables", "get_user_information");
// RESOURCES
export const useGetResourceUsage = () => useUAPI<Usage[]>("ResourceUsage", "get_usages");

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
export const useDumpDatabaseSchema = (database_type: "Mysql" | "Postgresql", dbname: string) =>
  useUAPI<string>(database_type, "dump_database_schema", { dbname });

// FILES
export const useListFiles = (dir: string) =>
  useUAPI<FileItem[]>("Fileman", "list_files", {
    dir,
    include_mime: 1,
  });
export const usGetFileContent = (dir: string, file: string) =>
  useUAPI<FileContent>("Fileman", "get_file_content", {
    dir,
    file,
  });

// FTP
export const useListFTPAccountsWithDiskInformation = () =>
  useUAPI<FTPAccountWithDiskInformation[]>("Ftp", "list_ftp_with_disk");

// API
export const useListAPITokens = () => useUAPI<APIToken[]>("Tokens", "list");
