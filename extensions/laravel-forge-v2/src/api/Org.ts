import { FORGE_API_URL } from "../config";
import { authHeaders, fetchAllPages } from "../lib/api";
import { OrgAttributes } from "../lib/jsonapi";

export interface IOrg {
  id: string;
  slug: string;
  name: string;
}

export const Org = {
  async getAll({ token }: { token: string }): Promise<IOrg[]> {
    if (!token) return [];
    const resources = await fetchAllPages<OrgAttributes>(`${FORGE_API_URL}/orgs`, {
      method: "get",
      headers: authHeaders(token),
    });
    return resources.map((r) => ({ id: r.id, slug: r.attributes.slug, name: r.attributes.name }));
  },
};
