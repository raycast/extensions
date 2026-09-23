export function isLatestSsidRequest(
  requestedSsid: string,
  connectedSsid: string | undefined,
  latestRequestedSsid: string | undefined,
): boolean {
  return (
    requestedSsid === connectedSsid && requestedSsid === latestRequestedSsid
  );
}
