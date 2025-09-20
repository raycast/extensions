import {
  CreateDNSRecordRequest,
  EditDNSRecordByDomainSubdomainAndIdRequest,
  ErrorResponse,
  DNSRecordType,
  RequestBody,
  Response,
  UpdateNameServersRequest,
  AddUrlForwardingRequest,
  GetNameServersResponse,
  GetUrlForwardingResponse,
  RetrieveSSLBundleResponse,
  RetrieveAllDomainsResponse,
} from "./types";
import { Toast, showToast } from "@raycast/api";
import { API_HEADERS, API_KEY, API_METHOD, API_URL, SECRET_API_KEY } from "./constants";
import { useFetch } from "@raycast/utils";

const showError = (error: string) => {
  showToast({
    style: Toast.Style.Failure,
    title: "Porkbun Error",
    message: error,
  });
};
const callApi = async (endpoint: string, animatedToastMessage = "", body?: RequestBody) => {
  await showToast(Toast.Style.Animated, "Processing...", animatedToastMessage);

  try {
    const apiResponse = await fetch(API_URL + endpoint, {
      method: API_METHOD,
      headers: API_HEADERS,
      body: JSON.stringify({
        apikey: API_KEY,
        secretapikey: SECRET_API_KEY,
        ...body,
      }),
    });

    const response = (await apiResponse.json()) as Response;
    if (!apiResponse.ok && response.status === "ERROR") {
      showError(response.message);
    }
    return response;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    const message = "Failed to execute request. Please try again later";
    showError(message);
    return {
      status: "ERROR",
      message,
    } as ErrorResponse;
  }
};

export async function ping() {
  return await callApi("ping", "Pinging");
}

export async function createRecord(domain: string, { ...params }: CreateDNSRecordRequest) {
  const body = { ...params };
  return await callApi(`dns/create/${domain}`, "Creating DNS Record", body);
}
export async function editRecordByDomainAndId(domain: string, id: number, { ...params }: CreateDNSRecordRequest) {
  const body = { ...params };
  return await callApi(`dns/edit/${domain}/${id}`, "Editing DNS Record", body);
}
export async function editRecordByDomainSubdomainAndType(
  domain: string,
  subdomain: string,
  type: DNSRecordType,
  { ...params }: EditDNSRecordByDomainSubdomainAndIdRequest,
) {
  const body = { ...params };
  return await callApi(
    `dns/editByNameType/${domain}/${type}${subdomain && "/" + subdomain}`,
    "Editing DNS Record",
    body,
  );
}
export async function deleteRecordByDomainAndId(domain: string, id: number) {
  return await callApi(`dns/delete/${domain}/${id}`, "Deleting DNS Record(s)");
}
export async function deleteRecordByDomainSubdomainAndType(domain: string, subdomain: string, type: DNSRecordType) {
  return await callApi(
    `dns/deleteByNameType/${domain}/${type}${subdomain && "/" + subdomain}`,
    "Deleting DNS Record(s)",
  );
}
export async function retrieveRecordsByDomainOrId(domain: string, id: number) {
  return await callApi(`dns/retrieve/${domain}${id > 0 ? "/" + id : ""}`, "Retrieving DNS Record(s)");
}
export async function retrieveRecordsByDomainSubdomainAndType(domain: string, subdomain: string, type: DNSRecordType) {
  return await callApi(
    `dns/retrieveByNameType/${domain}/${type}${subdomain && "/" + subdomain}`,
    "Retrieving DNS Record(s)",
  );
}

export function useRetrieveSSLBundle(domain: string) {
  return usePorkbun<RetrieveSSLBundleResponse>(`ssl/retrieve/${domain}`, "Fetching SSL Bundle");
}

export async function retrieveAllDomains() {
  return (await callApi("domain/listAll", "Fetching Domains", {
    includeLabels: "yes",
  })) as ErrorResponse | RetrieveAllDomainsResponse;
}
export function useGetNameServersByDomain(domain: string) {
  return usePorkbun<GetNameServersResponse>(`domain/getNs/${domain}`, "Fetching Name Servers", {
    async onData(data) {
      await showToast({
        style: Toast.Style.Success,
        title: "SUCCESS",
        message: `Fetched ${data.ns.length} Name Servers`,
      });
    },
  });
}
export async function updateNameServersByDomain(domain: string, { ...params }: UpdateNameServersRequest) {
  const body = { ...params };
  return await callApi(`domain/updateNs/${domain}`, "Updating Name Servers", body);
}
export async function getUrlForwardingByDomain(domain: string) {
  return (await callApi(`domain/getUrlForwarding/${domain}`, "Fetching URL Forwarding")) as
    | ErrorResponse
    | GetUrlForwardingResponse;
}
export async function deleteUrlForwardByDomainAndId(domain: string, id: string) {
  return await callApi(`domain/deleteUrlForward/${domain}/${id}`, "Deleting URL Forwarding");
}
export async function addUrlForwarding(domain: string, { ...params }: AddUrlForwardingRequest) {
  const body = { ...params };
  return await callApi(`domain/addUrlForward/${domain}`, "Adding URL Forwarding", body);
}

export const usePorkbun = <T>(endpoint: string, animatedToastMessage = "", options?: { onData: (date: T) => void }) => {
  const { isLoading, data, error, revalidate } = useFetch(API_URL + endpoint, {
    method: API_METHOD,
    headers: API_HEADERS,
    body: JSON.stringify({
      apikey: API_KEY,
      secretapikey: SECRET_API_KEY,
    }),
    async parseResponse(response) {
      const result = (await response.json()) as Response;
      if (result.status === "ERROR") throw new Error(result.message);
      return result as T;
    },
    async onWillExecute() {
      await showToast(Toast.Style.Animated, "Processing...", animatedToastMessage);
    },
    async onData(data) {
      options?.onData?.(data);
    },
    failureToastOptions: {
      title: "Porkbun Error",
    },
    keepPreviousData: true,
  });
  return { isLoading, data, error, revalidate };
};
