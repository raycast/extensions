import fetch, { RequestInit, Response, Headers } from "node-fetch";
import http from "http";
import https from "https";
import { BugzillaInstance } from "../../interfaces/bugzilla";
import { Bug } from "../../interfaces/bug";
import { convertUTCDateToLocalDate } from "../../utils/helpers/formatDate";

export class BugzillaAPI {
  public bugzilla: BugzillaInstance;

  constructor(b: BugzillaInstance) {
    this.bugzilla = b;
  }

  public async inspect(): Promise<Response> {
    const instanceUrl = new URL(this.bugzilla.url);
    this.bugzilla.version = JSON.parse(await this.request(new URL(`${this.bugzilla.url}/rest/version`)))["version"];
    instanceUrl.pathname += "/rest/valid_login";
    instanceUrl.searchParams.append("login", this.bugzilla.username);
    // If custom header is not used, provide API key as part of request
    if (!this.bugzilla.customHeader) {
      instanceUrl.searchParams.append("api_key", this.bugzilla.apiKey);
    }
    const result = JSON.parse(await this.request(instanceUrl));
    return result;
  }

  public async getBugs(searchP: Map<string, string>, query?: string) {
    const instanceUrl = new URL(this.bugzilla.url);
    instanceUrl.pathname += "/rest/bug";
    searchP.forEach((v, k) => instanceUrl.searchParams.append(k, v));
    if (query) instanceUrl.searchParams.append("quicksearch", query);
    const openBugs = JSON.parse(await this.request(instanceUrl))["bugs"];
    return openBugs.map((bug: Bug) => {
      // Add custom fields to object
      bug.bug_url = `${this.bugzilla.url}/show_bug.cgi?id=${bug.id}`; // Web URL
      bug.last_change_date_locale = convertUTCDateToLocalDate(bug.last_change_time);
      bug.creation_date_locale = convertUTCDateToLocalDate(bug.creation_time);
      return bug;
    });
  }

  public async getDetails(bugId: string) {
    const instanceUrl = new URL(this.bugzilla.url);
    instanceUrl.pathname += `/rest/bug`;
    instanceUrl.searchParams.append("id", bugId);
    // Older instances may not expose `description` field via API
    instanceUrl.searchParams.append("include_fields", "description");
    const description = JSON.parse(await this.request(instanceUrl))["bugs"][0]["description"];
    return description ? description : "_No description was returned_";
  }

  async request(url: URL, init?: RequestInit) {
    let urlAgent;
    if (url.toString().startsWith("http://")) {
      urlAgent = new http.Agent({});
    } else if (url.toString().startsWith("https://")) {
      urlAgent = new https.Agent({ rejectUnauthorized: !this.bugzilla.unsafeHttps });
    } else {
      return Promise.reject(new Error("Wrong scheme in URL"));
    }
    let headers: Headers | undefined = undefined;
    url.href = url.href.replace(/([^:]\/)\/+/g, "$1");
    if (this.bugzilla.customHeader) {
      const derivedTemplate = this.bugzilla.customHeader.toString().replace("${apiKey}", this.bugzilla.apiKey);
      headers = new Headers();
      headers.append(derivedTemplate.split(":")[0], derivedTemplate.split(":")[1]);
    }
    const resp = await fetch(url, {
      headers,
      method: "GET",
      agent: urlAgent,
      ...init,
    });
    const parsedResponse = await resp.text();

    if (!resp.ok) {
      if (resp.status === 400) {
        return Promise.reject(new Error(`API Error: ${parsedResponse}`));
      } else if (resp.status == 403) {
        return Promise.reject(new Error("Forbidden"));
      }
      return Promise.reject(`${resp.status} ${await resp.text()}`);
    }
    if (this.bugzilla.apiKey) {
      this.bugzilla.authorized = true;
      if (JSON.parse(parsedResponse)["result"] == false) {
        return Promise.reject(new Error("Provided username is not valid for provided API key"));
      }
    } else {
      this.bugzilla.authorized = false;
    }
    return parsedResponse;
  }
}
