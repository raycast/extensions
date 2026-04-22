import { getOrganizations } from "../utils/buffer-api";

/**
 * List the Buffer organizations available in the authenticated account.
 */
export default async function tool() {
  const organizations = await getOrganizations();

  return {
    totalOrganizations: organizations.length,
    organizations: organizations.map((organization) => ({
      id: organization.id,
      name: organization.name,
      ownerEmail: organization.ownerEmail,
      channelCount: organization.channelCount,
      members: organization.members?.totalCount,
      limits: organization.limits,
    })),
  };
}
