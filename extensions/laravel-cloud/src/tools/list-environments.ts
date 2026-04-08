import { listEnvironments } from "../api/environments";

type Input = {
  /** The ID of the application whose environments to list */
  applicationId: string;
};

export default async function (input: Input) {
  const response = await listEnvironments(input.applicationId);
  return response.data.map((env) => ({
    id: env.id,
    name: env.attributes.name,
    slug: env.attributes.slug,
    status: env.attributes.status,
    vanity_domain: env.attributes.vanity_domain,
    php_version: env.attributes.php_major_version,
    uses_octane: env.attributes.uses_octane,
    created_at: env.attributes.created_at,
  }));
}
