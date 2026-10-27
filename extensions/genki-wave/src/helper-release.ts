import type { HelperRelease } from "./helper-download";

// The helper release this version of the extension runs, built, signed and notarized by
// .github/workflows/helper-release.yml (scripts/helper-release.sh) and published in the
// public genkiinstruments/genki-wave-helper repository, which holds releases only. Update both fields
// together after a release: the checksum is the release's `.zip.sha256` asset.
const version = "helper-v6";

export const HELPER_RELEASE: HelperRelease = {
  version,
  sha256: "99287a685bbb4d09211b371f8cb011ceebf78680d8a75abf0899ecffaeb39f77",
  url: `https://github.com/genkiinstruments/genki-wave-helper/releases/download/${version}/wave-helper-${version}.zip`,
};
