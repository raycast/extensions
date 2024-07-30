import fetch from "node-fetch";
import { API_HEADERS, API_URL } from "./config";
import { ErrorResponse, GetOrganizationsResponse, GetServicesResponse, SuccessResponse } from "./types";

async function execStellate<T>(query: string) {
    const body = JSON.stringify({
      query
    });
    const response = await fetch(API_URL, {
        method: "POST",
        headers: API_HEADERS,
        body
    });
  
    if (!response.ok) {
        const result = await response.json() as ErrorResponse;
        throw new Error(result.errors[0].message);
    }
    const result = await response.json() as SuccessResponse<T>;
    return result.data;
}

export const getOrgs = async () => await execStellate<GetOrganizationsResponse>(`
    {
      organizations {
        edges {
          node {
            id
            name
            slug
          }
        }
      }  
    }
`);

export const getServices = async (orgSlug: string) => await execStellate<GetServicesResponse>(`
    {
      organization(slug: "${orgSlug}") {
        services {
          edges {
            node {
              cdnEndpoint
              name
            }
          }
        }
      }  
    }
`);
