export function removeHiddenBundleId(bundleId: string): string {
  if (bundleId.endsWith(".fake.bundle.id")) return "";
  return bundleId;
}
