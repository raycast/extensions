import { AccountDomains, DNSZoneRecord, EmailAccount, EmailAccountWithDiskInformation } from "./types";
import useUAPI from "./useUAPI";

// DOMAINS
export const useListDomains = () => useUAPI<AccountDomains>("DomainInfo", "list_domains");
export const useParsedDNSZone = (zone: string) => {
    const { data, ...rest} = useUAPI<DNSZoneRecord[]>("DNS", "parse_zone", { zone });
    if (data) {
        const filteredData = data.filter((item): item is DNSZoneRecord & { type: "record" } => item.type==="record");
        const parsedData = filteredData.map(item => {
            return { ...item, dname_b64: atob(item.dname_b64), data_b64: item.data_b64.map(d => atob(d)) };
        });
        return { data: parsedData, ...rest };
    }
    return { data, ...rest };
};

// EMAILS
export const useListEmailAccounts = () => useUAPI<EmailAccount[]>("Email", "list_pops", { skip_main: 1 });
export const useListEmailAccountsWithDiskInfo = (email: string, domain: string) => useUAPI<EmailAccountWithDiskInformation[]>("Email", "list_pops_with_disk", { email, domain, maxaccounts: 1, novalidate: 1 });