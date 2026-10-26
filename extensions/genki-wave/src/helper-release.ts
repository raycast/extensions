import type { HelperRelease } from "./helper-download";

// The helper release this version of the extension runs, built, signed and notarized by
// .github/workflows/helper-release.yml (scripts/helper-release.sh) and published in the
// public genkiinstruments/genki-wave-helper repository, which holds releases only. Update both fields
// together after a release: the checksum is the release's `.zip.sha256` asset.
const version = "helper-v5";

export const HELPER_RELEASE: HelperRelease = {
  version,
  sha256: "1a43cf1ce1521b7731251ef2a84d660f33c858ff7bd4f9cd6da266a41f3d4967",
  url: `https://github.com/genkiinstruments/genki-wave-helper/releases/download/${version}/wave-helper-${version}.zip`,
};
