import { getApplication } from "../api/applications";

type Input = {
  /** The ID of the application to retrieve */
  applicationId: string;
};

export default async function (input: Input) {
  const response = await getApplication(input.applicationId, "environments");
  const app = response.data;
  return {
    id: app.id,
    name: app.attributes.name,
    slug: app.attributes.slug,
    region: app.attributes.region,
    repository: app.attributes.repository?.full_name ?? null,
    default_branch: app.attributes.repository?.default_branch ?? null,
    slack_channel: app.attributes.slack_channel,
    avatar_url: app.attributes.avatar_url,
    environment_ids: app.relationships?.environments?.data.map((e) => e.id) ?? [],
    created_at: app.attributes.created_at,
  };
}
