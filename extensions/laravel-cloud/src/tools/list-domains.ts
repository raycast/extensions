import { listDomains } from "../api/domains";

type Input = {
  /** The ID of the environment whose domains to list */
  environmentId: string;
};

export default async function (input: Input) {
  const response = await listDomains(input.environmentId);
  return response.data.map((domain) => ({
    id: domain.id,
    name: domain.attributes.name,
    type: domain.attributes.type,
    hostname_status: domain.attributes.hostname_status,
    ssl_status: domain.attributes.ssl_status,
    origin_status: domain.attributes.origin_status,
    created_at: domain.attributes.created_at,
  }));
}
