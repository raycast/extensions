#!/bin/sh
# Runs one fabric call detached from Raycast, so it survives Raycast quitting.
#
#   fabric-bg.sh RUN_DIR FINAL_DIR FINAL_NAME PATTERN FABRIC [fabric args...]
#
# Every value arrives as an argument and is only ever expanded inside double
# quotes; nothing is eval'd. fabric's answer goes to RUN_DIR/answer.md (its
# --output is in the args) and is then copied to FINAL_DIR without ever
# overwriting a file. stderr is redacted on its way to disk. Nothing here
# writes the pasteboard. A notification names the pattern and how it ended.

umask 077
run_dir=$1
final_dir=$2
final_name=$3
pattern=$4
fabric=$5
shift 5

input="$run_dir/input.txt"
trap 'rm -f "$input"' EXIT

# Every exit file is written here. The input goes first: a record with an exit file is complete,
# and a Stop that reads it the moment it lands must find the selected text gone (the ISC-28.1 flake).
finish() {
  rm -f "$input"
  printf '%s\n' "$1" > "$run_dir/exit.tmp"
  mv "$run_dir/exit.tmp" "$run_dir/exit"
}

# Stop sends SIGTERM to this wrapper's group. fabric runs as a job in a group of its own
# (set -m), so the wrapper outlives a stubborn child of fabric's (yt-dlp) and can finish the
# job: SIGTERM, a grace period (FABRIC_BG_GRACE_DS tenths of a second, default 2 s), SIGKILL
# for what is left, and exit 143 only once the group is empty.
grace=${FABRIC_BG_GRACE_DS:-20}
case $grace in '' | *[!0-9]*) grace=20 ;; esac
job=
stop_job() {
  trap '' TERM
  if [ -n "$job" ]; then
    kill -TERM -"$job" 2> /dev/null
    t=0
    while kill -0 -"$job" 2> /dev/null && [ "$t" -lt "$grace" ]; do
      sleep 0.1
      t=$((t + 1))
    done
    kill -KILL -"$job" 2> /dev/null
    while kill -0 -"$job" 2> /dev/null; do sleep 0.1; done
  fi
  finish 143
  exit 143
}
# Until the job's group id is known, a Stop is only noted; the job is stopped as soon as it is.
stopping=
trap 'stopping=1' TERM

redact() {
  # Same rules as lib/redact.ts, character for character (test/background.test.ts diffs the two).
  # LC_ALL=C: under a UTF-8 locale macOS sed dies on the first invalid byte and the record is empty.
  LC_ALL=C sed -E \
    -e 's/(sk-|gsk_|xai-|pplx-|AIza)[A-Za-z0-9_-]+/\1[REDACTED]/g' \
    -e 's/([Bb]earer )[^[:space:]"'\'',]+/\1[REDACTED]/g' \
    -e 's/(([A-Za-z_-]*([Kk][Ee][Yy]|[Tt][Oo][Kk][Ee][Nn]|[Ss][Ee][Cc][Rr][Ee][Tt]|[Pp][Aa][Ss][Ss][Ww][Oo][Rr][Dd]))["'\'']?[[:blank:]]*[:=][[:blank:]]*["'\'']?)[^[:space:]"'\'',}]+/\1[REDACTED]/g'
}

tokens() {
  # Copies the counts on fabric's last token line to RUN_DIR/tokens before redaction, which could
  # eat a localized label. Same line shape as lib/metadata.ts (`[label] word: N | word: N | word: N`,
  # nothing else); only the three numbers are written, so no other stderr text reaches the record.
  # The path comes through the environment: awk -v would expand backslashes in it.
  TOKENS_FILE="$run_dir/tokens" LC_ALL=C awk '
    /^\[[^]]+\] [^0-9|]*(:|：) ?[0-9]+ \| [^0-9|]*(:|：) ?[0-9]+ \| [^0-9|]*(:|：) ?[0-9]+$/ {
      s = $0
      sub(/^\[[^]]+\]/, "", s)
      gsub(/[^0-9]+/, " ", s)
      split(s, n, " ")
      f = ENVIRON["TOKENS_FILE"]
      printf "[tokens] in: %s | out: %s | total: %s\n", n[1], n[2], n[3] > f
      close(f)
    }
    { print }'
}

src=/dev/null
[ -f "$input" ] && src=$input

set -m
({ "$fabric" "$@" < "$src" 2>&1 > /dev/null; echo $? > "$run_dir/code"; } | tokens | redact > "$run_dir/stderr") &
job=$!
set +m
trap stop_job TERM
[ -n "$stopping" ] && stop_job
# A trapped signal interrupts wait (it would not interrupt a foreground pipeline).
wait "$job"
# fabric's group is gone, so there is nothing left to stop: a Stop from here on must not turn a
# finished run into Stopped, kill the save half-way, or eat the notification (children inherit the
# ignore). Stop then sees the real exit and says it had already finished.
trap '' TERM
code=$(cat "$run_dir/code" 2>/dev/null || echo 1)
rm -f "$run_dir/code" "$input"

if [ "$code" -eq 0 ]; then
  # FINAL_DIR arrives fully resolved (guardDir's realpath). A long run gives time to swap it, or any
  # folder above it, for a symlink, so right before the copy it must still resolve to itself (TOCTOU).
  if [ "$(cd -P -- "$final_dir" 2> /dev/null && pwd -P)" != "$final_dir" ]; then
    echo "The Save Folder changed during the run (it is no longer a plain folder), so nothing was saved." >> "$run_dir/stderr"
    code=74
  elif [ ! -f "$run_dir/answer.md" ]; then
    echo "fabric finished but wrote no answer file" >> "$run_dir/stderr"
    code=1
  else
    stem=${final_name%.md}
    name=$final_name
    i=1
    while :; do
      target="$final_dir/$name"
      # set -C refuses only an existing regular file: a symlink to /dev/null would swallow the answer,
      # one to a FIFO would hang the run. Any name already taken, by anything, is skipped.
      if [ ! -L "$target" ] && [ ! -e "$target" ] && (set -C; cat "$run_dir/answer.md" > "$target") 2> /dev/null; then
        printf '%s\n' "$target" > "$run_dir/output"
        break
      fi
      i=$((i + 1))
      if [ "$i" -gt 999 ]; then
        echo "No free file name in the Save Folder." >> "$run_dir/stderr"
        code=73
        break
      fi
      name="$stem-$i.md"
    done
  fi
fi

if [ "$code" -eq 0 ]; then
  msg="Done: $pattern. Saved to your Save Folder."
else
  msg="Failed: $pattern (exit $code). See Show Background Runs for details."
fi
# Same notification as lib/macos.ts notifyArgv(); keep the two in sync. `--` ends osascript's
# options, so a message starting with -e is text, not more AppleScript.
"${FABRIC_BG_NOTIFIER:-/usr/bin/osascript}" \
  -e 'on run argv' -e 'display notification (item 1 of argv) with title "Fabric"' -e 'end run' \
  -- "$msg" > /dev/null 2>&1

# Written last, so a record with an exit file is complete.
finish "$code"
exit 0
