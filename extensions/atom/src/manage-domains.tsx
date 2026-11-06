import { Action, ActionPanel, Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { AtomDNSRecord, AtomDomain, AtomError, AtomSuccess, Pagination } from "./types";

const {api_token} = getPreferenceValues<Preferences>();
const API_URL = "https://www.atom.com/api/registrar/v1";
const API_HEADERS = {
    Authorization: `Bearer ${api_token}`
}
const parseAtomResponse = async <T,>(response: Response) => {
    const result = await response.json() as AtomError | AtomSuccess<T>;
    if (!result.success) throw new Error(result.message);
    return result;
}

export default function ManageDomains() {
    const {isLoading, data: domains, pagination} = useFetch((options) => `${API_URL}/domains?` + new URLSearchParams({
        page: String(options.page + 1),
        size: "20"
    }), {
        headers:API_HEADERS,
        async parseResponse(response) {
            const result = await response.json() as AtomError | AtomSuccess<AtomDomain[]> & Pagination;
            if (!result.success) throw new Error(result.message);
            if (!result.pagination.current_page) result.pagination.current_page = Number(new URL(response.url).searchParams.get("page"));
            return result;
        },
        mapResult(result) {
            return {
                data: result.data,
                hasMore: result.pagination.current_page! < result.pagination.total_pages
            }
        },
        initialData: []
    })

    return <List isLoading={isLoading} pagination={pagination}>
        {domains.map(domain => <List.Item key={domain.domain_name} icon={{source: Icon.Dot, tintColor: domain.status==="Active" ? Color.Green : undefined, tooltip: domain.status}} title={domain.domain_name} accessories={[
            domain.privacy_protect ? {icon: Icon.EyeDisabled, tooltip: "This Domain is Private"} : {icon: Icon.Eye},
            domain.transfer_locked ? {icon: Icon.Lock, tooltip: "60-day transfer lock"}:{icon: Icon.LockUnlocked},
            {...domain.icann_transfer_lock && {icon: Icon.Lock, tag: {value:"TRANSFER PROTECTED", color: Color.Green}}},
            {text: `Expires: ${new Intl.DateTimeFormat("en-US", {month: "short",day: "numeric",year: "numeric"}).format(new Date(domain.expiry_date))}`}
        ]} actions={<ActionPanel>
            <Action.Push icon={Icon.Text} title="Manage DNS" target={<ManageDNS domainName={domain.domain_name} />} />
        </ActionPanel>} />)}
    </List>
}

function ManageDNS({domainName}:{domainName: string}) {
    const {isLoading, data: records} = useFetch(`${API_URL}/domains/${domainName}/records`, {
        headers: API_HEADERS,
        parseResponse: parseAtomResponse<AtomDNSRecord[]>,
        mapResult(result) {
            return {
                data: result.data
            }
        },
        initialData: []
    })
    
    return <List isLoading={isLoading} isShowingDetail navigationTitle={`Manage Domains / ${domainName}`}>
        {records.map(record => <List.Item key={record.id} title={record.name} detail={<List.Item.Detail markdown={record.content} />} />)}
    </List>
}