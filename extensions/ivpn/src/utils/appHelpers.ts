import { Application, getApplications } from "@raycast/api";

const IVPN_BUNDLE_ID = "com.electron.ivpn-ui";

async function findApplication(bundleId: string): Promise<Application | undefined> {
  const installedApplications = await getApplications();
  return installedApplications.filter((application) => application.bundleId == bundleId)[0];
}

async function findIvpnApp() {
  return await findApplication(IVPN_BUNDLE_ID);
}

export async function checkIvpnAppExists() {
  return !!(await findIvpnApp());
}
