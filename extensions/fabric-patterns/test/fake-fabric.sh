#!/bin/sh
# Test double for the fabric CLI. Never calls a model.
#
# Logs every invocation to $FAKE_FABRIC_LOG (argv one per line, then a
# "--stdin--" marker and whatever arrived on stdin). List flags answer from
# fixtures. Knobs:
#   FAKE_FABRIC_EXIT    exit code to return (default 0)
#   FAKE_FABRIC_STDERR  text to print on stderr
#   FAKE_FABRIC_STDERR_FILE  file copied byte for byte to stderr
#   FAKE_FABRIC_CHUNKS  number of output chunks to stream (default 3)
#   FAKE_FABRIC_DELAY   seconds between chunks (default 0)
#   FAKE_FABRIC_SLEEP   seconds to sleep before answering (default 0)
#   FAKE_FABRIC_GATE    a path: wait until it exists before answering (a test opens the gate when ready)
#   FAKE_FABRIC_STUBBORN_PIDFILE  start a child that ignores SIGTERM (a yt-dlp stand-in) and write its pid here
#   FAKE_FABRIC_METADATA_FILE  token lines printed for --show-metadata --stream (default fixtures/metadata.txt; not on --dry-run)
#
# --workflow=FILE prints fabric's step progress on stderr. Before any step it
# refuses, with real fabric's text and exit 1, a step that repeats the one
# before it and a step pattern not listed in fixtures/patterns.txt.
#
# It always reads stdin with `cat`, so a caller that leaves stdin open
# hangs here, and the test's timeout fails it.
#
# Strict: a flag off ALLOWED exits 1 before anything is logged, so a misspelled
# flag reds the test that sent it. The message is real fabric's for an unknown
# name; real fabric words a bool given a value or a value flag given none
# differently ("bool flag … cannot have an argument", "expected argument for flag …").
# Value flags are listed with `=` and only taken in `--name=value` form, the
# only form our argv builder emits. Every entry must appear in fixtures/help.txt
# (fake-fabric.test.ts checks), and the fixtures are real fabric 1.4.518 captures.

ALLOWED="--pattern= --variable= --context= --session= --attachment= --config= --strategy= --model= --vendor= --output= --youtube= --transcript --transcript-with-timestamps --comments --metadata --scrape_url= --transcribe-file= --transcribe-model= --workflow= --spotify= --thinking= --search --stream --dry-run --show-metadata --version --updatepatterns --shell-complete-list -l --listpatterns -L --listmodels -x --listcontexts -X --listsessions --liststrategies --listvendors --list-transcription-models"

FIXTURES="${FAKE_FABRIC_FIXTURES:-$(dirname "$0")/fixtures}"
LOG="${FAKE_FABRIC_LOG:-/dev/null}"

# One pass: refuse, remember what was sent, pull out the values we act on.
# Dispatch below reads $seen, never the joined argv, so a value like
# `--variable=x:a -L b` can't trigger a branch.
seen=" "
workflow=""
out=""
for arg in "$@"; do
  case "$arg" in
    -*=*) key="${arg%%=*}=" ;;
    -*) key="$arg" ;;
    *)
      # Real fabric would take this as the message; buildArgv never sends one (ISC-2.1).
      printf "fake fabric: bare argument refused: %s\n" "$arg" >&2
      exit 1
      ;;
  esac
  case " $ALLOWED " in
    *" $key "*) seen="$seen$key " ;;
    *)
      flag="${arg#-}"; flag="${flag#-}"; flag="${flag%%=*}"
      printf "unknown flag \`%s'\n" "$flag" >&2
      exit 1
      ;;
  esac
  case "$arg" in
    --workflow=*) workflow="${arg#--workflow=}" ;;
    --output=*) out="${arg#--output=}" ;;
  esac
done
sent() { case "$seen" in *" $1 "*) return 0 ;; esac; return 1; }

{
  for arg in "$@"; do printf '%s\n' "$arg"; done
} >> "$LOG"

if sent -L || sent --listmodels; then
  if sent --shell-complete-list; then cat "$FIXTURES/models-complete.txt"; else cat "$FIXTURES/models.txt"; fi
  exit 0
fi
if sent --listvendors; then cat "$FIXTURES/vendors.txt"; exit 0; fi
if sent --shell-complete-list; then
  if sent -l || sent --listpatterns; then cat "$FIXTURES/patterns.txt"; exit 0; fi
  if sent --liststrategies; then cat "$FIXTURES/strategies.txt"; exit 0; fi
  if sent -x || sent --listcontexts; then cat "$FIXTURES/contexts.txt"; exit 0; fi
  if sent -X || sent --listsessions; then cat "$FIXTURES/sessions.txt"; exit 0; fi
fi
if sent --version; then echo "v0.0.0-fake"; exit 0; fi
# Fetches patterns, never a model run; what real fabric prints here isn't captured, so nothing is.
if sent --updatepatterns; then
  if [ -n "${FAKE_FABRIC_STDERR:-}" ]; then printf '%s\n' "$FAKE_FABRIC_STDERR" >&2; fi
  exit "${FAKE_FABRIC_EXIT:-0}"
fi

input="$(cat)"
printf -- '--stdin--\n%s\n' "$input" >> "$LOG"

# --workflow=FILE: step progress on stderr in fabric's shape (fixtures/workflow-progress.txt).
if [ -n "$workflow" ]; then
  if [ ! -f "$workflow" ]; then
    echo "Error reading workflow file: open $workflow: no such file or directory" >&2
    exit 1
  fi
  steps="$(grep -o '"pattern" *: *"[^"]*"' "$workflow" | sed 's/.*"\([^"]*\)"$/\1/')"
  total="$(printf '%s\n' "$steps" | grep -c .)"
  # Like fabric 1.4.518, check every step before running any (probed; the ISC-78.1 captures).
  i=1
  prev=""
  for step in $steps; do
    if [ "$step" = "$prev" ]; then
      printf 'workflow %s is invalid: [step %s/%s %s] repeats the previous step\n' "$workflow" "$i" "$total" "$step" >&2
      exit 1
    fi
    if ! grep -qx -- "$step" "$FIXTURES/patterns.txt"; then
      printf "workflow %s is invalid: [step %s/%s %s] pattern not found: pattern '%s' not found. Run 'fabric -l' to see available patterns\n" "$workflow" "$i" "$total" "$step" "$step" >&2
      exit 1
    fi
    prev="$step"
    i=$((i + 1))
  done
  i=1
  len="${#input}"
  for step in $steps; do
    printf '[step %s/%s %s] running...\n' "$i" "$total" "$step" >&2
    printf '[step %s/%s %s] model= vendor= inputLen=%s override=false\n' "$i" "$total" "$step" "$len" >&2
    len=$((len + 100))
    printf '[step %s/%s %s] done (%s chars)\n' "$i" "$total" "$step" "$len" >&2
    i=$((i + 1))
  done
fi

if [ -n "${FAKE_FABRIC_STUBBORN_PIDFILE:-}" ]; then
  # Ignored signals survive exec, so only SIGKILL ends this child.
  (trap '' TERM; exec sleep 30) < /dev/null > /dev/null 2>&1 &
  echo $! > "$FAKE_FABRIC_STUBBORN_PIDFILE"
fi
if [ -n "${FAKE_FABRIC_SLEEP:-}" ]; then sleep "$FAKE_FABRIC_SLEEP"; fi
if [ -n "${FAKE_FABRIC_GATE:-}" ]; then while [ ! -e "$FAKE_FABRIC_GATE" ]; do sleep 0.02; done; fi

if [ -n "${FAKE_FABRIC_STDERR:-}" ]; then printf '%s\n' "$FAKE_FABRIC_STDERR" >&2; fi
if [ -n "${FAKE_FABRIC_STDERR_FILE:-}" ]; then cat "$FAKE_FABRIC_STDERR_FILE" >&2; fi

code="${FAKE_FABRIC_EXIT:-0}"
if [ "$code" -ne 0 ]; then exit "$code"; fi

# --output=FILE: like fabric 1.4.518, refuse an existing file, else write the answer there too.
if [ -n "$out" ] && [ -e "$out" ]; then
  echo "file $out already exists, not overwriting" >&2
  exit 1
fi

n="${FAKE_FABRIC_CHUNKS:-3}"
i=1
while [ "$i" -le "$n" ]; do
  printf 'chunk %s\n' "$i"
  if [ -n "$out" ]; then printf 'chunk %s\n' "$i" >> "$out"; fi
  if [ -n "${FAKE_FABRIC_DELAY:-}" ]; then sleep "$FAKE_FABRIC_DELAY"; fi
  i=$((i + 1))
done

# Real fabric prints tokens only when streaming (probed on fabric 1.4.518).
# A dry run prints made-up counts (fixtures/metadata-dry-run.txt), also only when streaming.
if sent --show-metadata && sent --stream; then
  if sent --dry-run; then meta="$FIXTURES/metadata-dry-run.txt"; else meta="${FAKE_FABRIC_METADATA_FILE:-$FIXTURES/metadata.txt}"; fi
  cat "$meta" >&2
fi
exit 0
