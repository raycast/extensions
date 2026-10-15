import type { HelperRelease } from "./helper-download";

// The helper release this version of the extension runs, built, signed and notarized by
// .github/workflows/helper-release.yml (scripts/helper-release.sh) and published in the
// public genkiinstruments/genki-wave-helper repository, which holds releases only. Update both fields
// together after a release: the checksum is the release's `.zip.sha256` asset.
const version = "helper-v3";

export const HELPER_RELEASE: HelperRelease = {
  version,
  sha256: "9525d325d6c1a8fe1dd32311465dc0ce69b1ff109c258d9af4858d580bed3dbe",
  url: `https://github.com/genkiinstruments/genki-wave-helper/releases/download/${version}/wave-helper-${version}.zip`,
};
