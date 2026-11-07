#!/bin/sh
# status-demo.sh: walk a Rex terminal through every OSC 7501 program state so you can watch
# the tab indicators, the Dock badge, Program Activity, and the Raycast extension react.
#
#   scripts/status-demo.sh                      tour every state, pausing between them
#   scripts/status-demo.sh -a claude-code -s 6  pretend to be Claude Code, 6 s per step
#   scripts/status-demo.sh blocked "Need a password" auth
#   scripts/status-demo.sh working "Building" "" 42
#   scripts/status-demo.sh done "Tests passed"
#   scripts/status-demo.sh clear
#
# Options: -a APP (program id, default demo) -s SECONDS (pause per tour step, default 4)
#          -H SECONDS (how long a one-shot working/blocked report is held, default 20)
#
# Run it inside a Rex terminal. Rex drops working and blocked records as soon as the shell
# prompt returns, so those are held for a while; done and error stay until cleared.
set -eu

APP=demo
STEP=4
HOLD=20
TITLE="Status demo"

usage() {
  sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'
}

while getopts "a:s:H:h" opt; do
  case $opt in
    a) APP=$OPTARG ;;
    s) STEP=$OPTARG ;;
    H) HOLD=$OPTARG ;;
    h) usage; exit 0 ;;
    *) usage; exit 2 ;;
  esac
done
shift $((OPTIND - 1))

b64() {
  printf '%s' "$1" | base64 | tr -d '\n'
}

# report STATE [MSG] [KIND] [PROGRESS] [ID]
report() {
  state=$1
  msg=${2:-}
  kind=${3:-}
  progress=${4:-}
  id=${5:-}
  pairs="state=$state"
  if [ "$state" != clear ]; then
    pairs="$pairs:app=$APP:title=$(b64 "$TITLE")"
  fi
  [ -n "$msg" ] && pairs="$pairs:msg=$(b64 "$msg")"
  [ -n "$kind" ] && pairs="$pairs:kind=$kind"
  [ -n "$progress" ] && pairs="$pairs:progress=$progress"
  [ -n "$id" ] && pairs="$pairs:id=$id"
  printf '\033]7501;%s\033\\' "$pairs"
}

announce() {
  printf '%-10s %s\n' "$1" "$2"
}

cleanup() {
  report clear
  printf '\ncleared\n'
  exit 130
}

if [ $# -gt 0 ]; then
  state=$1
  msg=${2:-}
  kind=${3:-}
  progress=${4:-}
  report "$state" "$msg" "$kind" "$progress"
  announce "$state" "${msg:-}${kind:+ ($kind)}${progress:+ $progress%}"
  case $state in
    working | blocked)
      trap cleanup INT TERM
      printf 'holding for %ss so the prompt does not clear it (Ctrl-C to clear now)\n' "$HOLD"
      sleep "$HOLD"
      ;;
  esac
  exit 0
fi

trap cleanup INT TERM
printf 'Program status tour as app "%s", %ss per step. Watch the tab icon, the Dock, and Raycast.\n\n' "$APP" "$STEP"

announce working "indeterminate"
report working "Starting the demo"
sleep "$STEP"

for p in 0 20 40 60 80 100; do
  announce working "progress $p%"
  report working "Building step $p of 100" "" "$p"
  sleep "$(awk "BEGIN { print $STEP / 6 }")"
done

announce blocked "permission"
report blocked "Waiting for permission to run the tests" permission
sleep "$STEP"

announce blocked "question"
report blocked "Which branch should I use?" question
sleep "$STEP"

announce blocked "auth"
report blocked "The registry needs a password" auth
sleep "$STEP"

announce done ""
report done "Everything finished"
sleep "$STEP"

announce error ""
report error "The build failed on step 3"
sleep "$STEP"

announce idle ""
report idle "Resting until you type something"
sleep "$STEP"

announce clear ""
report clear
printf '\nDone. Run with a state name to leave one on, e.g. %s done "Tests passed"\n' "$0"
