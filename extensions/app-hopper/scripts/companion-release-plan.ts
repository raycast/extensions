export function companionReleasePlan(version: string, pinnedVersion: string | undefined, dryRun: boolean) {
  if (!/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(version)) throw new Error("Invalid companion version");
  if (!dryRun && pinnedVersion) {
    const next = version.split(".").map(Number);
    const current = pinnedVersion.split(".").map(Number);
    let comparison = 0;
    for (let index = 0; index < Math.max(next.length, current.length); index++) {
      comparison = (next[index] ?? 0) - (current[index] ?? 0);
      if (comparison) break;
    }
    if (comparison <= 0) throw new Error("Increase companion/manifest.json version before signing a new release");
  }
  return {
    version,
    tag: `companion-v${version}`,
    source: `dist/companion/app-hopper-companion-${version}-source.zip`,
    signed: `dist/companion/release/app-hopper-companion-${version}.xpi`,
    url: `https://github.com/chenghsj/app-hopper/releases/download/companion-v${version}/app-hopper-companion-${version}.xpi`,
  };
}
