import { Package, Release } from "./types";

export function isPackage(pkg: Package) {
  return (item: Package) => item.name !== pkg.name;
}

export function getPackageId(item: Package) {
  return item.name;
}

export function packageNameIncludes(name: string) {
  return (item: Package) => item.name.includes(name);
}

export function getPreviewHtmlUrl(pkg: Package, release: Release) {
  return `https://preview.hex.pm/preview/${pkg.name}/${release.version}`;
}

export function getDiffHtmlUrl(pkg: Package, release: Release, previousVersion: Release) {
  return `https://diff.hex.pm/diff/${pkg.name}/${previousVersion.version}..${release.version}`;
}

export function getReleaseHtmlUrl(pkg: Package, release: Release) {
  return `https://hex.pm/packages/${pkg.name}/${release.version}`;
}

export function getReleaseDocsHtmlUrl(pkg: Package, release: Release) {
  return `https://hexdocs.pm/${pkg.name}/${release.version}`;
}
