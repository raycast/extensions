export function isLatestSsidRequest(
  requestedSsid: string,
  connectedSsid: string | undefined,
  latestRequestedSsid: string | undefined,
): boolean {
  return (
    requestedSsid === connectedSsid && requestedSsid === latestRequestedSsid
  );
}

/**
 * 802.1X (WPA/WPA2/WPA3-Enterprise) networks need EAP settings and user credentials
 * that a password-only profile cannot express, so first joins are handed to Windows.
 */
export function isEnterpriseAuth(authentication: string | undefined): boolean {
  return /enterprise|802\.1x/i.test(authentication ?? "");
}
