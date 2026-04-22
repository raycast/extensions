import { getAccount } from "../utils/buffer-api";

/**
 * Get the authenticated Buffer account, including organizations and connected apps.
 */
export default async function tool() {
  const account = await getAccount();

  return {
    id: account.id,
    name: account.name,
    email: account.email,
    backupEmail: account.backupEmail,
    timezone: account.timezone,
    createdAt: account.createdAt,
    organizationCount: account.organizations.length,
    organizations: account.organizations.map((organization) => ({
      id: organization.id,
      name: organization.name,
      ownerEmail: organization.ownerEmail,
      channelCount: organization.channelCount,
      members: organization.members?.totalCount,
    })),
    connectedApps: (account.connectedApps ?? []).map((app) => ({
      name: app.name,
      description: app.description,
      website: app.website,
      createdAt: app.createdAt,
    })),
  };
}
