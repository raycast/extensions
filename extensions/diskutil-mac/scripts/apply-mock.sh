#!/usr/bin/env bash
#
# Configure the mock layer and (optionally) launch `ray develop`.
#
# Two pieces of state move together:
#   1. src/utils/mockBridge.ts        — stub (mock excluded) or re-export (mock active)
#   2. src/mocks/mockOverride.json    — {} (off) or { enabled, scenario, ... }
#
# Both are committed in their OFF state. Enabling writes the dev-mode content
# to both — `git status` will show them as modified so it can't be committed
# silently. Disabling restores the committed state.
#
# Usage:
#   scripts/apply-mock.sh off                 -> disable
#   scripts/apply-mock.sh on                  -> enable, scenario from mockConfig.json
#   scripts/apply-mock.sh <name|number>       -> enable with that scenario
#   add --launch  to spawn `ray develop` after
#   add --log     to bake logCalls: true into the override

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BRIDGE_PATH="$ROOT/src/utils/mockBridge.ts"
OVERRIDE_PATH="$ROOT/src/mocks/mockOverride.json"
CONFIG_PATH="$ROOT/src/mocks/mockConfig.json"

LAUNCH=0
LOG=0
REF=""
for arg in "$@"; do
  case "$arg" in
    --launch) LAUNCH=1 ;;
    --log)    LOG=1 ;;
    --*)      ;;                       # ignore unknown flags
    *)        [ -z "$REF" ] && REF="$arg" ;;
  esac
done

write_stub() {
  # Single-quoted EOF — no shell expansion, so backticks and ${...} stay literal.
  cat > "$BRIDGE_PATH" <<'EOF'
/**
 * Bridge between production code and the mock layer.
 *
 * Committed state: STUB. No `import from "../mocks/..."`, so esbuild can't
 * reach `src/mocks/` and drops the whole folder from the shipped bundle.
 *
 * `npm run dev:mock` rewrites this file to re-export from the real mock
 * module; `dev` / `mock off` / `build` / `publish` rewrite it back. The
 * swap is visible in `git status` so it can't be committed by accident.
 * Production code MUST import from here, never from `../mocks/...` directly.
 */
export const isMockEnabled = (): boolean => false;
export const mockExec = async (command: string): Promise<string> => {
  throw new Error(`Mock layer is not active (received: ${command}). Run \`npm run dev:mock\` to enable.`);
};
EOF
  printf '{}\n' > "$OVERRIDE_PATH"
  # Restore mockConfig.json baseline from git HEAD so any local tweaks made
  # during a mock session are wiped on `dev` / `mock off` / `build` / `publish`.
  if command -v git >/dev/null 2>&1; then
    git -C "$ROOT" checkout HEAD -- "$CONFIG_PATH" 2>/dev/null || true
  fi
}

write_dev() {
  cat > "$BRIDGE_PATH" <<'EOF'
/**
 * AUTO-GENERATED dev-mode bridge by scripts/apply-mock.sh.
 *
 * **DO NOT COMMIT in this state.** Run `npm run mock off` (or `npm run dev`)
 * to restore the stub before committing/publishing.
 *
 * This re-exports the real mock module so esbuild follows the import into
 * `src/mocks/` and bundles it for dev. Production builds use the stub form
 * of this file (see git HEAD).
 */
export { isMockEnabled, mockExec } from "../mocks/mockDiskutil";
EOF
  {
    printf '{\n  "enabled": true'
    [ "$REF" != "on" ] && printf ',\n  "scenario": "%s"' "$REF"
    [ "$LOG" -eq 1 ]   && printf ',\n  "logCalls": true'
    printf '\n}\n'
  } > "$OVERRIDE_PATH"
}

if [ -z "$REF" ] || [ "$REF" = "off" ]; then
  write_stub
  echo "[mock] disabled (bridge=stub, override={})"
else
  write_dev
  suffix=""; [ "$LOG" -eq 1 ] && suffix=", log=on"
  echo "[mock] enabled (bridge=dev, scenario=${REF}${suffix})"
fi

if [ "$LAUNCH" -eq 1 ]; then
  exec npx ray develop
fi
