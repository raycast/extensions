import { platform, release } from "os";

function isDarwin() {
  return platform() === "darwin";
}

function getDarwinMajorVersion() {
  return parseInt(release().split(".")[0]);
}

export function isSequoia() {
  if (!isDarwin()) return false;

  // A mapping between Darwin and macOS is available at http://en.wikipedia.org/wiki/Darwin_%28operating_system%29#Release_history
  // Darwin 24 = macOS Sequoia 15.0, Darwin 25+ = macOS Sequoia 15.1+
  return getDarwinMajorVersion() >= 24;
}
