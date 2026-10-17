import { listApplications } from "../api/applications";

export default async function () {
  const response = await listApplications();
  return response.data.map((app) => ({
    id: app.id,
    name: app.attributes.name,
    slug: app.attributes.slug,
    region: app.attributes.region,
    repository: app.attributes.repository?.full_name ?? null,
    created_at: app.attributes.created_at,
  }));
}
