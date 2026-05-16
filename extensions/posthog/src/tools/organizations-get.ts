import { listOrganizations } from "../api/organizations";

export default async function () {
  const { results } = await listOrganizations();
  return {
    organizations: results.map((o) => ({ id: o.id, name: o.name, slug: o.slug })),
  };
}
