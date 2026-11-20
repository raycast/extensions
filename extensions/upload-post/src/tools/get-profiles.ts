import { accountLabel, connectedAccounts, getProfiles, UNAVAILABLE_PLATFORMS } from "../api";

/**
 * Lists the Upload-Post profiles with the platforms connected to each one.
 */
export default async function tool() {
  const { profiles, plan } = await getProfiles();
  return profiles.map((profile) => {
    const accounts = connectedAccounts(profile).filter((a) => !UNAVAILABLE_PLATFORMS.includes(a.platform));
    return {
      username: profile.username,
      plan,
      connectedPlatforms: accounts.filter((a) => !a.reauthRequired).map((a) => a.platform),
      reconnectRequired: accounts.filter((a) => a.reauthRequired).map((a) => a.platform),
      accounts: accounts.map((a) => ({
        platform: a.platform,
        account: accountLabel(a.account),
        needsReconnect: a.reauthRequired,
      })),
    };
  });
}
