export function removeHiddenBundleId(bundleId: string | undefined): string {
  if (bundleId === undefined || bundleId.endsWith(".fake.bundle.id")) return "";
  return bundleId;
}
