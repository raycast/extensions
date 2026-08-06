#!/bin/bash
#
# Diagnostic probe — capture the raw PostToolUse payload for the Artifact tool.
#
# WHY THIS EXISTS
#
# This extension's whole design rests on one assumption: that Claude Code's
# `PostToolUse` hook fires for the harness-provided `Artifact` tool, and that
# the payload contains the artifact's URL. Claude Code documents the hook
# config contract, but the `Artifact` tool_response shape is undocumented — so
# record-artifact.sh has to guess at field names, with a regex sweep as a
# fallback.
#
# Run this probe to replace that guess with an observation. It records the exact
# payload your machine produces, so you can confirm what the hook actually sees
# instead of trusting anyone's assumption about it — including this repo's.
#
# WHAT IT DOES
#
# Appends the raw JSON payload to ~/.claude/artifact-probe.jsonl. Nothing else: no
# network calls, no writes to the artifact index, no modification of any config.
# It is safe to leave installed, and safe to delete at any time.
#
# USAGE
#
#   1. Install:
#        mkdir -p ~/.claude/hooks
#        cp scripts/probe-artifact-hook.sh ~/.claude/hooks/
#        chmod +x ~/.claude/hooks/probe-artifact-hook.sh
#
#   2. Register it in ~/.claude/settings.json (APPEND to hooks.PostToolUse —
#      never replace the array, which may already contain your own hooks):
#        {
#          "matcher": "Artifact",
#          "hooks": [
#            { "type": "command", "command": "$HOME/.claude/hooks/probe-artifact-hook.sh", "timeout": 10 }
#          ]
#        }
#
#   3. Restart Claude Code — hook registration only takes effect in a new
#      session.
#
#   4. In an INTERACTIVE session (not `claude -p`), publish a throwaway
#      artifact, then inspect the capture:
#        scripts/probe-artifact-hook.sh --report
#
#   5. Remove the probe entry from settings.json when you're done.
#
# INTERPRETING THE RESULT
#
#   File has content -> PostToolUse DOES observe Artifact. Read the real
#                       tool_response shape and reconcile record-artifact.sh
#                       against what you actually saw.
#   File empty/absent -> PostToolUse does NOT observe Artifact. The hook design
#                       cannot work; the index would need a manual "Add
#                       Artifact" command instead.

set -uo pipefail

# Default the capture to a private, user-owned path — NOT a fixed name in the
# world-writable /tmp.
#
# The payload this records is not innocuous: it carries session ids, the
# transcript path, the working directory, tool input, and artifact URLs. A
# predictable /tmp name is both a symlink-attack target (another local account
# pre-creates it pointing at a file they can then have this hook clobber) and a
# disclosure risk (a permissive umask leaves the capture world-readable).
CAPTURE="${ARTIFACT_PROBE_FILE:-${HOME}/.claude/artifact-probe.jsonl}"

# --report mode: summarize what was captured, for humans.
if [ "${1:-}" = "--report" ]; then
  # Ignore blank lines so the count reflects real payloads.
  #
  # `grep -c` prints 0 AND exits 1 when nothing matches, so a `|| echo 0`
  # fallback appends a SECOND zero — producing the two-line value "0\n0", which
  # then fails the integer comparison below with a syntax error. Collect the
  # matching lines instead, where the exit status carries no such surprise.
  MATCHES=""
  [ -f "${CAPTURE}" ] && MATCHES="$(grep '[^[:space:]]' "${CAPTURE}" 2>/dev/null || true)"

  # An absent file and a file holding only whitespace mean the same thing to the
  # user — nothing was recorded — so they must produce the same message. Testing
  # `-s` alone lets a whitespace-only capture fall through to the report body and
  # print a "Captured 0 payloads" header followed by empty sections.
  if [ -z "${MATCHES}" ]; then
    cat <<EOF
No payloads captured at ${CAPTURE}.

Either the probe is not registered / Claude Code was not restarted, no artifact
has been published since installing it, or PostToolUse does not observe the
Artifact tool at all. Confirm the first three before concluding the third.
EOF
    exit 0
  fi

  COUNT="$(printf '%s\n' "${MATCHES}" | wc -l | tr -d '[:space:]')"
  LATEST="$(printf '%s\n' "${MATCHES}" | tail -1)"

  if [ "${COUNT}" -eq 1 ]; then
    echo "Captured 1 payload at ${CAPTURE}"
  else
    echo "Captured ${COUNT} payloads at ${CAPTURE}"
  fi
  echo
  if command -v jq >/dev/null 2>&1; then
    echo "=== Top-level keys present ==="
    jq -r 'keys | join(", ")' "${CAPTURE}" 2>/dev/null | sort -u | sed 's/^/  /'
    echo
    echo "=== tool_response type, per payload ==="
    jq -r '.tool_response | type' "${CAPTURE}" 2>/dev/null | sed 's/^/  /'
    echo
    echo "=== Artifact URLs found ==="
    grep -oE 'https://claude\.ai/(code/)?artifact/[0-9a-fA-F-]{36}' "${CAPTURE}" | sort -u | sed 's/^/  /' ||
      echo "  (none — the payload carries no artifact URL)"
    echo
    echo "=== Most recent payload, pretty-printed ==="
    printf '%s' "${LATEST}" | jq . 2>/dev/null || printf '%s\n' "${LATEST}"
  else
    echo "(install jq for a structured report)"
    echo
    printf '%s\n' "${LATEST}"
  fi
  exit 0
fi

# Capture mode: append stdin as exactly one line, so the file stays valid JSONL
# and `wc -l` reports the true payload count. Exit 0 unconditionally — a
# diagnostic must never fail the turn it is observing.
PAYLOAD="$(cat)" || exit 0
[ -n "${PAYLOAD}" ] || exit 0

# Refuse to write through a symlink. An append redirection FOLLOWS one, so a
# pre-created symlink at the capture path would send this payload — session ids,
# transcript path, artifact URLs — into a file chosen by whoever planted it.
# Bail silently rather than writing somewhere unintended; this is a diagnostic,
# and declining to record is always an acceptable outcome.
if [ -L "${CAPTURE}" ]; then
  exit 0
fi

mkdir -p "$(dirname "${CAPTURE}")" 2>/dev/null || exit 0

# Create the file owner-only BEFORE the first write, so the payload is never
# briefly readable under a permissive umask.
if [ ! -e "${CAPTURE}" ]; then
  (umask 077; : >>"${CAPTURE}") 2>/dev/null || exit 0
fi

# printf adds the single trailing newline; a blank line would inflate the count
# and make `tail -1` return nothing.
printf '%s\n' "${PAYLOAD}" >>"${CAPTURE}" 2>/dev/null || true
exit 0
