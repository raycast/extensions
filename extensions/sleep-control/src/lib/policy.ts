export const POLICY_PATH = "/private/etc/sudoers.d/raycast-sleep-control";

export function parseSleepDisabled(output: string): boolean {
  const matches = [...output.matchAll(/^\s*SleepDisabled\s+([01])\s*$/gm)];
  if (matches.length !== 1) throw new Error("macOS did not report a clear sleep setting. Try refreshing.");
  return matches[0][1] === "1";
}

export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

export function policyRule(account: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(account) || account === "root" || account === "ALL") {
    throw new Error("This Mac account cannot use quick switching. You can still use macOS approval for each change.");
  }
  return `"${account}" ALL=(root) NOPASSWD: /usr/bin/pmset -a disablesleep 0, /usr/bin/pmset -a disablesleep 1\n`;
}

export function hasManagedGrant(listing: string): boolean {
  return listing
    .split(/^\s*Sudoers entry:/m)
    .slice(1)
    .some((entry) => {
      const source = entry.split("\n")[0].trim();
      if (source && source !== POLICY_PATH) return false;
      if (!/^\s*RunAsUsers:\s*root\s*$/m.test(entry)) return false;
      const options =
        entry
          .match(/^\s*Options:\s*(.+)$/m)?.[1]
          .split(",")
          .map((value) => value.trim()) ?? [];
      if (!options.includes("!authenticate") || options.includes("authenticate")) return false;
      const commands =
        entry
          .split(/^\s*Commands:\s*$/m)[1]
          ?.split("\n")
          .map((value) => value.trim())
          .filter(Boolean) ?? [];
      return (
        commands.length === 2 && [0, 1].every((value) => commands.includes(`/usr/bin/pmset -a disablesleep ${value}`))
      );
    });
}

// Runs only after the user chooses a permission action and approves the native
// macOS administrator dialog. No user-owned executable is run with privileges.
export function permissionScript(account: string, action: "install" | "remove"): string {
  const rule = policyRule(account);
  // Accept only the exact lower-case rule produced by the earlier private
  // installer. Uppercase aliases are never accepted as a legacy username.
  const legacy = /^[a-z_][a-z0-9_-]*$/.test(account) ? rule.replace(`"${account}"`, account) : undefined;
  return `set -eu
target=${shellQuote(POLICY_PATH)}
umask 077
staged=$(/usr/bin/mktemp /private/tmp/raycast-sleep-control.XXXXXX)
trap '/bin/rm -f "$staged"' EXIT
printf '%s' ${shellQuote(rule)} > "$staged"
/usr/sbin/visudo -cf "$staged" >/dev/null
if [ -L "$target" ]; then
  echo 'SLEEP_CONTROL_POLICY_CONFLICT' >&2
  exit 1
fi
if [ -e "$target" ] && ! /usr/bin/cmp -s "$staged" "$target"; then
  if ! { ${legacy ? `printf '%s' ${shellQuote(legacy)} | /usr/bin/cmp -s - "$target"` : "false"}; }; then
    echo 'SLEEP_CONTROL_POLICY_CONFLICT' >&2
    exit 1
  fi
fi
${
  action === "remove"
    ? `/bin/rm -f "$target"`
    : `/usr/sbin/visudo -c >/dev/null
if ! /usr/bin/grep -Eq '^[[:space:]]*[@#]includedir[[:space:]]+(/private)?/etc/sudoers[.]d[[:space:]]*$' /private/etc/sudoers; then
  echo 'SLEEP_CONTROL_POLICY_UNSUPPORTED' >&2
  exit 1
fi
if [ ! -e "$target" ]; then
  /usr/bin/install -o root -g wheel -m 0440 "$staged" "$target"
  if ! /usr/sbin/visudo -c >/dev/null; then
    /bin/rm -f "$target"
    exit 1
  fi
fi`
}
`;
}
