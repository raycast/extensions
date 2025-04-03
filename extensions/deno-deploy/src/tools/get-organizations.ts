import { createWindowLessFetcher } from "@/api/dash";
import type { Organization } from "@/api/types";

const tool = async () => {
  const fetcher = createWindowLessFetcher();
  const organizations = await fetcher.requestJSON<Organization[]>(`/organizations`);
  const orgs = organizations.map((org) => {
    if (!org.name) {
      return { ...org, name: "Personal" };
    }
    return org;
  });
  return orgs;
};

export default tool;
