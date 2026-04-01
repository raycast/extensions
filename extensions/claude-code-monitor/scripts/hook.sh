#!/bin/bash
set -euo pipefail

export STATE_DIR="$HOME/.claude/claude-code-monitor"
export STATE_FILE="$STATE_DIR/sessions.json"
LOCK_DIR="$STATE_DIR/.lock"

# Read JSON from stdin into a temp file (avoids shell expansion issues)
export INPUT_FILE=$(mktemp)
cat > "$INPUT_FILE"

# Ensure state directory exists
mkdir -p "$STATE_DIR"

# Acquire lock (mkdir is atomic on POSIX)
acquire_lock() {
  local max_wait=50
  local i=0
  while ! mkdir "$LOCK_DIR" 2>/dev/null; do
    i=$((i + 1))
    if [ $i -ge $max_wait ]; then
      rmdir "$LOCK_DIR" 2>/dev/null || true
      mkdir "$LOCK_DIR" 2>/dev/null || true
      break
    fi
    sleep 0.02
  done
}

release_lock() {
  rmdir "$LOCK_DIR" 2>/dev/null || true
  rm -f "$INPUT_FILE" 2>/dev/null || true
}

trap release_lock EXIT

acquire_lock

# Python does everything: read input, read state, update, write state atomically
/usr/bin/python3 << 'PYEOF'
import json, os, time

input_file = os.environ.get('INPUT_FILE', '')
state_dir = os.path.expanduser('~/.claude/claude-code-monitor')
state_file = os.path.join(state_dir, 'sessions.json')

# Read hook input
try:
    with open(input_file) as f:
        hook_input = json.load(f)
except:
    raise SystemExit(0)

# Read existing state
if os.path.exists(state_file):
    try:
        with open(state_file) as f:
            data = json.load(f)
    except:
        data = {'version': 1, 'sessions': {}}
else:
    data = {'version': 1, 'sessions': {}}

sid = hook_input.get('session_id', '')
if not sid:
    raise SystemExit(0)

event = hook_input.get('hook_event_name', '')
cwd = hook_input.get('cwd', '')
transcript = hook_input.get('transcript_path', '')
source = hook_input.get('source', '')

# Map event to state
if event == 'Notification':
    ntype = hook_input.get('notification_type', '')
    if ntype in ('permission_prompt', 'elicitation_dialog'):
        new_state = 'waiting'
    else:
        new_state = 'idle'
else:
    state_map = {
        'SessionStart': 'idle',
        'UserPromptSubmit': 'active',
        'PreToolUse': 'active',
        'Stop': 'idle',
        'SessionEnd': 'ended',
    }
    new_state = state_map.get(event, '')
    if not new_state:
        raise SystemExit(0)

now = int(time.time() * 1000)
session = data.get('sessions', {}).get(sid, {})

# Ensure base fields exist
if 'session_id' not in session:
    session['session_id'] = sid
    session['cwd'] = cwd
    session['project_name'] = os.path.basename(cwd) if cwd else sid[:8]
    session['transcript_path'] = transcript
    session['started_at'] = now
    session['ended_at'] = None
    session['source'] = source

# Always backfill term_program if missing
if not session.get('term_program'):
    session['term_program'] = os.environ.get('TERM_PROGRAM', '')

if event == 'SessionStart':
    session['cwd'] = cwd
    session['project_name'] = os.path.basename(cwd) if cwd else ''
    session['transcript_path'] = transcript
    session['started_at'] = now
    session['ended_at'] = None
    session['source'] = source
    session['term_program'] = os.environ.get('TERM_PROGRAM', '')

if event == 'SessionEnd':
    session['ended_at'] = now

# Capture first prompt for label generation
LABEL_PREFIX = 'Summarize this request in 5 words or less'
if event == 'UserPromptSubmit' and not session.get('first_prompt'):
    prompt_text = hook_input.get('prompt', '')
    if prompt_text and not prompt_text.startswith(LABEL_PREFIX):
        session['first_prompt'] = prompt_text[:300]
        if not session.get('label'):
            session['label_pending'] = True
    elif prompt_text.startswith(LABEL_PREFIX):
        # Mark as internal session, skip tracking
        session['_internal'] = True

session['state'] = new_state
session['last_updated_at'] = now
session['last_event'] = event

data['sessions'][sid] = session

# Cleanup: remove ended sessions older than 1 hour
cutoff = now - 3600000
data['sessions'] = {
    k: v for k, v in data['sessions'].items()
    if v.get('state') != 'ended' or (v.get('ended_at') or now) > cutoff
}

# Cleanup: mark stale sessions (no update in 30 min) as ended
stale_cutoff = now - 1800000
for k, v in list(data['sessions'].items()):
    if v.get('state') != 'ended' and v.get('last_updated_at', now) < stale_cutoff:
        v['state'] = 'ended'
        v['ended_at'] = now
        v['last_event'] = 'StaleCleanup'

# Atomic write directly from Python
tmp = state_file + '.tmp.' + str(os.getpid())
with open(tmp, 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
os.rename(tmp, state_file)
PYEOF

# Async label generation
if grep -q '"label_pending": true' "$STATE_FILE" 2>/dev/null; then
  (
    sleep 1
    /usr/bin/python3 << 'LABELEOF'
import json, os, subprocess, time

state_file = os.path.expanduser('~/.claude/claude-code-monitor/sessions.json')
lock_dir = os.path.expanduser('~/.claude/claude-code-monitor/.lock')

with open(state_file) as f:
    data = json.load(f)

changed = False
for sid, s in data.get('sessions', {}).items():
    if not s.get('label_pending'):
        continue
    prompt = s.get('first_prompt', '')
    if not prompt:
        s.pop('label_pending', None)
        changed = True
        continue

    try:
        result = subprocess.run(
            ['claude', '-p', '--model', 'haiku',
             'Summarize this request in 5 words or less, output only the summary: ' + prompt[:200]],
            capture_output=True, text=True, timeout=30
        )
        label = result.stdout.strip()
        if label:
            s['label'] = label[:30]
    except:
        pass

    s.pop('label_pending', None)
    changed = True

if changed:
    for i in range(50):
        try:
            os.mkdir(lock_dir)
            break
        except FileExistsError:
            time.sleep(0.02)
    else:
        try: os.rmdir(lock_dir)
        except: pass
        try: os.mkdir(lock_dir)
        except: pass

    try:
        tmp = state_file + '.tmp.' + str(os.getpid())
        with open(tmp, 'w') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        os.rename(tmp, state_file)
    finally:
        try: os.rmdir(lock_dir)
        except: pass
LABELEOF
  ) &
fi
