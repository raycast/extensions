import { getPreferenceValues } from "@raycast/api";
import { Integration, ListResult } from "./types";

class Chatwoot {
    private url: string;
    private accessToken: string;
    private accountId: string;
    public contacts: IntegrationsService;

    constructor(url: string, accessToken: string, accountId: string) {
        this.url = url;
        this.accessToken = accessToken;
        this.accountId = accountId;
        this.contacts = new IntegrationsService(this);
    }

    public buildUrl(route: string) {
        return new URL(route, this.url);
    }

    protected async request<T> (endpoint: string) {
        const response = await fetch(this.buildUrl(`api/v1/accounts/${this.accountId}/${endpoint}`), {
            headers : {
                api_access_token: this.accessToken
            }
        })
        if (!response.headers.get("content-type")?.includes("json")) throw new Error(response.statusText);
        const result = await response.json();
        if (!response.ok) throw new Error((result as {error:string}).error);
        return result as T;
    }
}

class IntegrationsService {
    constructor(private client: Chatwoot) {}
    async list() {
        return this.client["request"]<ListResult<Integration>>("integrations/apps");
    }
}

const {chatwoot_url, access_token,account_id} = getPreferenceValues<Preferences>()
export const chatwoot = new Chatwoot(chatwoot_url, access_token, account_id);