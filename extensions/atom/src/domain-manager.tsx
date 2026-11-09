import { Action, ActionPanel, Color, Form, Icon, List, popToRoot, showToast, Toast } from "@raycast/api";
import { useFetch, useForm } from "@raycast/utils";
import { AtomDNSRecord, AtomDomain, AtomError, AtomNameservers, AtomSuccess, Pagination } from "./types";
import { API_HEADERS, API_URL, parseAtomResponse, showError } from "./atom";

export default function DomainManager() {
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
            <Action.Push icon={Icon.List} title="Manage Nameservers" target={<ManageNameservers domainName={domain.domain_name} />} />
            <Action.Push icon={Icon.Text} title="Manage DNS" target={<ManageDNS domainName={domain.domain_name} />} />
            <ActionPanel.Section title="Privacy">
                <Action.OpenInBrowser title="Check WHOIS Info" url={`https://www.atom.com/whois/${domain.domain_name}`} />
            </ActionPanel.Section>
        </ActionPanel>} />)}
    </List>
}

function ManageNameservers({domainName}: {domainName: string}) {
    const {isLoading, data} = useFetch(`${API_URL}/domains/${domainName}/nameservers`, {
        headers: API_HEADERS,
        parseResponse: parseAtomResponse<AtomNameservers>,
        initialData: []
    })

    const {handleSubmit,itemProps,values} = useForm<{type: string, nameservers: string}>({
        async onSubmit(values) {
            const toast = await showToast(Toast.Style.Animated, "Updating");
            try {
                const nameservers = values.type==="custom" ? values.nameservers.split("\n") : [];
              const response = await fetch(`${API_URL}/domains/${domainName}/nameservers`, {
                method: "PUT",
                headers: API_HEADERS,
                body: JSON.stringify({
                    type: values.type,
                    nameservers
                })
              })
               await parseAtomResponse(response);
               toast.title = "Updated";
               await popToRoot();
            } catch (error) {
            showError(error);
            }

        },
        initialValues: {
            type: data.type,
            nameservers: data.nameservers.join("\n"),
        },
        validation: {
            nameservers(value) {
                if (values.type==="custom" && !value) return "The item is required"
            },
        }
    })

    const FORM_DESCRIPTION: {[key:string]: string} = {
        atom: `Use Atom nameservers to manage DNS records directly in Atom.

ns1.atomregistrar.com
ns2.atomregistrar.com`,
        marketplace: `Use these if you plan to list the domain for sale on Atom Marketplace.
        
ns1.atom.com
ns2.atom.com`,
custom: `Use external nameservers or hosting providers to manage DNS records outside Atom.`
    }

    return <Form isLoading={isLoading} actions={<ActionPanel>
        <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
    </ActionPanel>}>
        <Form.Dropdown title="Manage Nameservers" {...itemProps.type}>
            <Form.Dropdown.Item title="Atom Default Nameservers" value="atom" />
            <Form.Dropdown.Item title="Atom Marketplace Nameservers" value="parking" />
            <Form.Dropdown.Item title="My Own Nameservers" value="custom" />
        </Form.Dropdown>
            <Form.Description text={FORM_DESCRIPTION[values.type]} />
            {values.type==="custom" && <Form.TextArea title="Enter nameservers" placeholder="ns1.example.com
ns2.example.com" {...itemProps.nameservers} />}
    </Form>
}

function ManageDNS({domainName}:{domainName: string}) {
    const {isLoading, data: records} = useFetch(`${API_URL}/domains/${domainName}/records`, {
        headers: API_HEADERS,
        parseResponse: parseAtomResponse<AtomDNSRecord[]>,
        initialData: []
    })
    
    return <List isLoading={isLoading} isShowingDetail navigationTitle={`Manage Domains / ${domainName}`}>
        {records.map(record => <List.Item key={record.id} title={record.name} detail={<List.Item.Detail markdown={record.content} />} />)}
    </List>
}