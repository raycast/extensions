import { getEnvironment } from "../api/environments";

type Input = {
  /** The ID of the environment to retrieve */
  environmentId: string;
};

export default async function (input: Input) {
  const response = await getEnvironment(input.environmentId);
  const env = response.data;
  return {
    id: env.id,
    name: env.attributes.name,
    slug: env.attributes.slug,
    status: env.attributes.status,
    vanity_domain: env.attributes.vanity_domain,
    php_version: env.attributes.php_major_version,
    node_version: env.attributes.node_version,
    build_command: env.attributes.build_command,
    deploy_command: env.attributes.deploy_command,
    uses_octane: env.attributes.uses_octane,
    uses_hibernation: env.attributes.uses_hibernation,
    uses_push_to_deploy: env.attributes.uses_push_to_deploy,
    application_id: env.relationships?.application?.data?.id ?? null,
    current_deployment_id: env.relationships?.currentDeployment?.data?.id ?? null,
    created_at: env.attributes.created_at,
  };
}
