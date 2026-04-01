import { showToast, Toast, showHUD } from "@raycast/api";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const HOOK_SOURCE = path.join(__dirname, "..", "scripts", "hook.sh");
const STATE_DIR = path.join(os.homedir(), ".claude", "claude-code-monitor");
const HOOK_DEST = path.join(STATE_DIR, "hook.sh");
const SETTINGS_PATH = path.join(os.homedir(), ".claude", "settings.json");

const HOOKS_CONFIG = {
  SessionStart: [
    {
      matcher: "",
      hooks: [
        { type: "command", command: "~/.claude/claude-code-monitor/hook.sh" },
      ],
    },
  ],
  SessionEnd: [
    {
      matcher: "",
      hooks: [
        { type: "command", command: "~/.claude/claude-code-monitor/hook.sh" },
      ],
    },
  ],
  Stop: [
    {
      matcher: "",
      hooks: [
        { type: "command", command: "~/.claude/claude-code-monitor/hook.sh" },
      ],
    },
  ],
  UserPromptSubmit: [
    {
      matcher: "",
      hooks: [
        { type: "command", command: "~/.claude/claude-code-monitor/hook.sh" },
      ],
    },
  ],
  PreToolUse: [
    {
      matcher: "",
      hooks: [
        { type: "command", command: "~/.claude/claude-code-monitor/hook.sh" },
      ],
    },
  ],
  Notification: [
    {
      matcher: "",
      hooks: [
        { type: "command", command: "~/.claude/claude-code-monitor/hook.sh" },
      ],
    },
  ],
};

export default async function SetupCommand() {
  try {
    // 1. Create state directory
    await fs.promises.mkdir(STATE_DIR, { recursive: true });

    // 2. Copy hook script
    let hookSource = HOOK_SOURCE;

    // Try multiple paths to find hook.sh
    if (!fs.existsSync(hookSource)) {
      // Try relative to the extension's root
      const altPath = path.join(__dirname, "..", "assets", "hook.sh");
      if (fs.existsSync(altPath)) {
        hookSource = altPath;
      } else {
        // Write hook script inline as fallback
        await writeHookScript(HOOK_DEST);
        hookSource = "";
      }
    }

    if (hookSource) {
      await fs.promises.copyFile(hookSource, HOOK_DEST);
    }

    await fs.promises.chmod(HOOK_DEST, 0o755);

    // 3. Merge hooks into settings.json
    let settings: Record<string, unknown> = {};
    try {
      const raw = await fs.promises.readFile(SETTINGS_PATH, "utf8");
      settings = JSON.parse(raw);
    } catch {
      // File doesn't exist or invalid JSON, start fresh
    }

    const existingHooks = (settings.hooks || {}) as Record<string, unknown[]>;
    const mergedHooks = { ...existingHooks };

    // Merge our hooks without overwriting existing ones
    for (const [event, config] of Object.entries(HOOKS_CONFIG)) {
      const existing = mergedHooks[event] as
        | Array<{ matcher: string; hooks: unknown[] }>
        | undefined;
      if (!existing) {
        mergedHooks[event] = config;
      } else {
        // Check if our hook is already registered
        const alreadyRegistered = existing.some((entry) =>
          entry.hooks?.some((h: unknown) => {
            const hook = h as { command?: string };
            return hook.command?.includes("claude-code-monitor");
          }),
        );
        if (!alreadyRegistered) {
          mergedHooks[event] = [...existing, ...config];
        }
      }
    }

    settings.hooks = mergedHooks;

    // Atomic write
    const tempPath = SETTINGS_PATH + ".tmp";
    await fs.promises.writeFile(tempPath, JSON.stringify(settings, null, 2));
    await fs.promises.rename(tempPath, SETTINGS_PATH);

    await showHUD("Claude Code Monitor hooks installed successfully!");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Setup Failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function writeHookScript(destPath: string) {
  const script = `#!/bin/bash
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
`;
  await fs.promises.writeFile(destPath, script, { mode: 0o755 });
}
