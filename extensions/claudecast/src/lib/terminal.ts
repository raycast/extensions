import { getPreferenceValues, showToast, Toast, open } from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const execFilePromise = promisify(execFile);

type TerminalApp = "Terminal" | "iTerm" | "Warp" | "kitty" | "Ghostty";

/**
 * Open a new terminal window/tab and run a command
 */
export async function openTerminalWithCommand(
  command: string,
  options: {
    cwd?: string;
    terminalApp?: string;
  } = {},
): Promise<void> {
  const preferences = getPreferenceValues<Preferences>();
  const terminal = (options.terminalApp ||
    preferences.terminalApp ||
    "Terminal") as TerminalApp;
  const cwd = options.cwd || process.env.HOME || "/";

  try {
    switch (terminal) {
      case "Terminal":
        await openInTerminalApp(command, cwd);
        break;
      case "iTerm":
        await openInITerm(command, cwd);
        break;
      case "Warp":
        await openInWarp(command, cwd);
        break;
      case "kitty":
        await openInKitty(command, cwd);
        break;
      case "Ghostty":
        await openInGhostty(command, cwd);
        break;
      default:
        await openInTerminalApp(command, cwd);
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open terminal",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function openInTerminalApp(command: string, cwd: string): Promise<void> {
  const escapedCommand = command.replace(/"/g, '\\"').replace(/\$/g, "\\$");
  const escapedCwd = cwd.replace(/"/g, '\\"');

  const script = `
    tell application "Terminal"
      activate
      do script "cd \\"${escapedCwd}\\" && ${escapedCommand}"
    end tell
  `;

  await execFilePromise("osascript", ["-e", script]);
}

async function openInITerm(command: string, cwd: string): Promise<void> {
  const escapedCommand = command.replace(/"/g, '\\"').replace(/\$/g, "\\$");
  const escapedCwd = cwd.replace(/"/g, '\\"');

  const script = `
    tell application "iTerm"
      activate
      create window with default profile
      tell current session of current window
        write text "cd \\"${escapedCwd}\\" && ${escapedCommand}"
      end tell
    end tell
  `;

  await execFilePromise("osascript", ["-e", script]);
}

async function openInWarp(command: string, cwd: string): Promise<void> {
  // Warp supports a special URL scheme
  const encodedCommand = encodeURIComponent(`cd "${cwd}" && ${command}`);
  await open(`warp://action/new_tab?command=${encodedCommand}`);
}

async function openInKitty(command: string, cwd: string): Promise<void> {
  // Kitty can be invoked directly via execFile with array arguments
  await execFilePromise("kitty", [
    "--single-instance",
    `--directory=${cwd}`,
    "-e",
    "sh",
    "-c",
    command,
  ]);
}

async function openInGhostty(command: string, cwd: string): Promise<void> {
  const escapedCommand = command.replace(/"/g, '\\"').replace(/\$/g, "\\$");
  const escapedCwd = cwd.replace(/"/g, '\\"');

  // Try direct invocation first via execFile with array arguments
  try {
    await execFilePromise("ghostty", [
      `--working-directory=${cwd}`,
      "-e",
      "sh",
      "-c",
      command,
    ]);
  } catch {
    // Fallback to AppleScript using execFile with array arguments
    const script = `
      tell application "Ghostty"
        activate
      end tell
      delay 0.5
      tell application "System Events"
        keystroke "cd \\"${escapedCwd}\\" && ${escapedCommand}"
        keystroke return
      end tell
    `;
    await execFilePromise("osascript", ["-e", script]);
  }
}

/**
 * Launch Claude Code in a terminal
 */
export async function launchClaudeCode(options: {
  projectPath?: string;
  sessionId?: string;
  continueSession?: boolean;
  forkSession?: boolean;
  prompt?: string;
  printMode?: boolean; // Use -p flag for non-interactive output
  dangerouslySkipPermissions?: boolean; // Skip permission prompts for autonomous workflows
}): Promise<void> {
  const args: string[] = ["claude"];

  // Add dangerous mode flag first if specified (for autonomous workflows like Ralph Loop)
  if (options.dangerouslySkipPermissions) {
    args.push("--dangerously-skip-permissions");
  }

  if (options.sessionId) {
    args.push("-r", options.sessionId);
    if (options.forkSession) {
      args.push("--fork-session");
    }
  } else if (options.continueSession) {
    args.push("-c");
  }

  if (options.prompt) {
    // For complex prompts (multi-line, special chars), use a temp file to avoid escaping issues
    const needsTempFile =
      options.prompt.includes("\n") ||
      options.prompt.includes("<") ||
      options.prompt.includes(">");

    if (needsTempFile && !options.printMode) {
      // Write prompt to temp file and use cat to pipe it
      const tempFile = join(tmpdir(), `claudecast-prompt-${Date.now()}.txt`);
      writeFileSync(tempFile, options.prompt, "utf-8");
      // Use cat to pipe the prompt, then remove the temp file
      const catCmd = `cat "${tempFile}" | claude; rm "${tempFile}"`;
      await openTerminalWithCommand(catCmd, { cwd: options.projectPath });
      return;
    } else if (options.printMode) {
      // Non-interactive mode - just print result and exit
      args.push("-p", `"${options.prompt.replace(/"/g, '\\"')}"`);
    } else {
      // Interactive mode - start session with initial prompt
      // Escape the prompt for shell and add as positional argument
      args.push(`"${options.prompt.replace(/"/g, '\\"')}"`);
    }
  }

  const command = args.join(" ");
  await openTerminalWithCommand(command, { cwd: options.projectPath });
}

/**
 * Launch Ralph Loop with fresh context windows
 * Each iteration runs in a NEW Claude session to avoid context degradation
 *
 * Phase 1: Planning - Claude breaks down the task into atomic steps
 * Phase 2: Execution - Each step is executed in a fresh context window
 */
export async function launchRalphFreshLoop(options: {
  projectPath: string;
  task: string;
  requirements: string;
  maxIterations: number;
}): Promise<void> {
  const { projectPath, task, requirements, maxIterations } = options;

  // Generate the bash script that orchestrates fresh context sessions
  const scriptContent = generateRalphScript(task, requirements, maxIterations);

  // Write script to temp file
  const scriptFile = join(tmpdir(), `ralph-fresh-${Date.now()}.sh`);
  writeFileSync(scriptFile, scriptContent, { mode: 0o755 });

  // Create the .ralph directory with initial task info (plan will be generated by first Claude session)
  const ralphDir = join(projectPath, ".ralph");
  const taskFile = join(ralphDir, "task.md");
  const taskContent = generateTaskFile(task, requirements);

  // Command to setup and run the script
  const setupAndRunCmd = `
mkdir -p "${ralphDir}" && \\
cat > "${taskFile}" << 'TASK_EOF'
${taskContent}
TASK_EOF
bash "${scriptFile}"; rm -f "${scriptFile}"
`.trim();

  await openTerminalWithCommand(setupAndRunCmd, { cwd: projectPath });
}

/**
 * Generate the task file content (stores original user request)
 * The actual plan with atomic tasks will be generated by Claude in the planning phase
 */
function generateTaskFile(task: string, requirements: string): string {
  return `# Ralph Loop Task

## Main Goal
${task}

## Requirements
${requirements || "No specific requirements provided."}

---
_This file stores the original task. See plan.md for the breakdown into atomic tasks._
`;
}

/**
 * Generate the bash script for fresh context Ralph Loop
 *
 * MARKER FILE APPROACH: Full TUI visibility + Fresh context per task
 *
 * Two-phase approach:
 * 1. PLANNING PHASE: Claude breaks down the task into atomic steps
 * 2. EXECUTION PHASE: Each atomic task is completed in a fresh Claude session
 *
 * Key mechanism:
 * - Interactive mode shows full TUI (no script command that garbles output)
 * - Claude creates a marker file (.ralph/done) when finished
 * - Background watcher detects marker file and kills Claude process
 * - Bash loop starts fresh session for next task
 *
 * NOTE: This generates a bash script, so we use string concatenation to avoid
 * JavaScript template literal interpolation of bash variables like ${VAR}
 */
function generateRalphScript(
  task: string,
  requirements: string,
  maxIterations: number,
): string {
  // Escape single quotes for bash heredoc
  const escapedTask = task.replace(/'/g, "'\\''");
  const escapedReqs = requirements.replace(/'/g, "'\\''");

  // Use dollar sign variable to avoid ESLint escaping issues
  const $ = "$";

  // Build bash script using concatenation to preserve bash variable syntax
  const script = `#!/bin/bash
# Ralph Fresh Context Loop - Generated by ClaudeCast
# MARKER FILE APPROACH: Full TUI visibility + Fresh context per task
#
# Phase 1: Planning - Claude breaks down task into atomic steps (full TUI)
# Phase 2: Execution - Each step runs in a fresh context window (full TUI)
#
# Key: Claude creates .ralph/done marker file when finished, watcher kills process

set -e

RALPH_DIR=".ralph"
TASK_FILE="${$}{RALPH_DIR}/task.md"
PLAN_FILE="${$}{RALPH_DIR}/plan.md"
STOP_FILE="${$}{RALPH_DIR}/stop"
DONE_MARKER="${$}{RALPH_DIR}/done"
LOG_FILE="${$}{RALPH_DIR}/loop.log"
MAX_ITERATIONS=${maxIterations}
ITERATION=0

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
CYAN='\\033[0;36m'
NC='\\033[0m' # No Color

log() {
    echo -e "${$}{BLUE}[Ralph]${$}{NC} ${$}1"
    echo "[${$}(date '+%Y-%m-%d %H:%M:%S')] ${$}1" >> "${$}LOG_FILE"
}

log_success() {
    echo -e "${$}{GREEN}[Ralph]${$}{NC} ${$}1"
    echo "[${$}(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: ${$}1" >> "${$}LOG_FILE"
}

log_warning() {
    echo -e "${$}{YELLOW}[Ralph]${$}{NC} ${$}1"
    echo "[${$}(date '+%Y-%m-%d %H:%M:%S')] WARNING: ${$}1" >> "${$}LOG_FILE"
}

log_error() {
    echo -e "${$}{RED}[Ralph]${$}{NC} ${$}1"
    echo "[${$}(date '+%Y-%m-%d %H:%M:%S')] ERROR: ${$}1" >> "${$}LOG_FILE"
}

log_phase() {
    echo -e "${$}{CYAN}[Ralph]${$}{NC} ${$}1"
    echo "[${$}(date '+%Y-%m-%d %H:%M:%S')] PHASE: ${$}1" >> "${$}LOG_FILE"
}

# Check if there are remaining unchecked tasks
has_remaining_tasks() {
    grep -q '^- \\[ \\]' "${$}PLAN_FILE" 2>/dev/null
}

# Count completed and remaining tasks
count_tasks() {
    local completed remaining total
    completed=${$}(grep -c '^- \\[x\\]' "${$}PLAN_FILE" 2>/dev/null || echo 0)
    remaining=${$}(grep -c '^- \\[ \\]' "${$}PLAN_FILE" 2>/dev/null || echo 0)
    total=${$}((completed + remaining))
    echo "${$}completed/${$}total"
}

# Get the next task description
get_next_task() {
    grep -m1 '^- \\[ \\]' "${$}PLAN_FILE" 2>/dev/null | sed 's/^- \\[ \\] //'
}

#######################################
# Run Claude with signal file detection
# Runs Claude normally (full TUI), watcher monitors signal file for stop token
# Only kills our specific Claude process (by PID), not other sessions
#######################################
STOP_TOKEN="###RALPH_TASK_COMPLETE###"
SIGNAL_FILE="${$}{RALPH_DIR}/signal"

run_claude_with_watcher() {
    local PROMPT_FILE="${$}1"
    local WATCHER_PID=""
    local CLAUDE_PID=""

    # Remove any existing signal file
    rm -f "${$}SIGNAL_FILE"

    # Run Claude in background so we can capture its PID
    cat "${$}PROMPT_FILE" | claude --dangerously-skip-permissions &
    CLAUDE_PID=${$}!

    # Start background watcher that monitors signal file for stop token
    (
        while true; do
            # Check if signal file exists and contains stop token
            if [[ -f "${$}SIGNAL_FILE" ]] && grep -q "${$}STOP_TOKEN" "${$}SIGNAL_FILE" 2>/dev/null; then
                # Give Claude a moment to finish any final output
                sleep 2
                # Kill only OUR Claude process by PID
                kill -9 ${$}CLAUDE_PID 2>/dev/null || true
                exit 0
            fi
            # Also check if Claude exited on its own
            if ! kill -0 ${$}CLAUDE_PID 2>/dev/null; then
                exit 0
            fi
            sleep 1
        done
    ) &
    WATCHER_PID=${$}!

    # Wait for Claude to finish (either naturally or killed by watcher)
    wait ${$}CLAUDE_PID 2>/dev/null || true

    # Cleanup watcher
    kill ${$}WATCHER_PID 2>/dev/null || true
    wait ${$}WATCHER_PID 2>/dev/null || true

    # Check if signal file contains stop token (indicates successful completion)
    if [[ -f "${$}SIGNAL_FILE" ]] && grep -q "${$}STOP_TOKEN" "${$}SIGNAL_FILE" 2>/dev/null; then
        rm -f "${$}SIGNAL_FILE"
        return 0
    else
        rm -f "${$}SIGNAL_FILE"
        return 1
    fi
}

log "=============================================="
log "   Ralph Fresh Context Loop"
log "=============================================="
log "Stop gracefully: touch ${$}STOP_FILE"
log "Full TUI visible during Claude sessions!"
log ""

#######################################
# Generate resume.sh script for continuing later
#######################################
generate_resume_script() {
    cat > "${$}RALPH_DIR/resume.sh" << 'RESUME_SCRIPT_EOF'
#!/bin/bash
# Ralph Loop Resume Script - Continue incomplete tasks
# Usage: bash .ralph/resume.sh [max-iterations]
#        Default: 10 iterations

set -e

MAX_ITERATIONS=${$}{1:-10}
RALPH_DIR=".ralph"
PLAN_FILE="${$}{RALPH_DIR}/plan.md"
STOP_FILE="${$}{RALPH_DIR}/stop"
SIGNAL_FILE="${$}{RALPH_DIR}/signal"
LOG_FILE="${$}{RALPH_DIR}/loop.log"
ITERATION=0

# Colors
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
CYAN='\\033[0;36m'
NC='\\033[0m'

log() { echo -e "${$}{BLUE}[Ralph]${$}{NC} ${$}1"; echo "[${$}(date '+%Y-%m-%d %H:%M:%S')] ${$}1" >> "${$}LOG_FILE"; }
log_success() { echo -e "${$}{GREEN}[Ralph]${$}{NC} ${$}1"; echo "[${$}(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: ${$}1" >> "${$}LOG_FILE"; }
log_warning() { echo -e "${$}{YELLOW}[Ralph]${$}{NC} ${$}1"; echo "[${$}(date '+%Y-%m-%d %H:%M:%S')] WARNING: ${$}1" >> "${$}LOG_FILE"; }
log_phase() { echo -e "${$}{CYAN}[Ralph]${$}{NC} ${$}1"; echo "[${$}(date '+%Y-%m-%d %H:%M:%S')] PHASE: ${$}1" >> "${$}LOG_FILE"; }

has_remaining_tasks() { grep -q '^- \\[ \\]' "${$}PLAN_FILE" 2>/dev/null; }
count_tasks() {
    local completed remaining total
    completed=${$}(grep -c '^- \\[x\\]' "${$}PLAN_FILE" 2>/dev/null || echo 0)
    remaining=${$}(grep -c '^- \\[ \\]' "${$}PLAN_FILE" 2>/dev/null || echo 0)
    total=${$}((completed + remaining))
    echo "${$}completed/${$}total"
}
get_next_task() { grep -m1 '^- \\[ \\]' "${$}PLAN_FILE" 2>/dev/null | sed 's/^- \\[ \\] //'; }

STOP_TOKEN="###RALPH_TASK_COMPLETE###"

run_claude_with_watcher() {
    local PROMPT_FILE="${$}1"
    local WATCHER_PID="" CLAUDE_PID=""
    rm -f "${$}SIGNAL_FILE"
    cat "${$}PROMPT_FILE" | claude --dangerously-skip-permissions &
    CLAUDE_PID=${$}!
    (
        while true; do
            if [[ -f "${$}SIGNAL_FILE" ]] && grep -q "${$}STOP_TOKEN" "${$}SIGNAL_FILE" 2>/dev/null; then
                sleep 2; kill -9 ${$}CLAUDE_PID 2>/dev/null || true; exit 0
            fi
            if ! kill -0 ${$}CLAUDE_PID 2>/dev/null; then exit 0; fi
            sleep 1
        done
    ) &
    WATCHER_PID=${$}!
    wait ${$}CLAUDE_PID 2>/dev/null || true
    kill ${$}WATCHER_PID 2>/dev/null || true; wait ${$}WATCHER_PID 2>/dev/null || true
    if [[ -f "${$}SIGNAL_FILE" ]] && grep -q "${$}STOP_TOKEN" "${$}SIGNAL_FILE" 2>/dev/null; then
        rm -f "${$}SIGNAL_FILE"; return 0
    else
        rm -f "${$}SIGNAL_FILE"; return 1
    fi
}

# Check prerequisites
if [[ ! -f "${$}PLAN_FILE" ]]; then
    echo -e "${$}{RED}[Ralph]${$}{NC} No plan.md found. Run Ralph Loop from Raycast first to create a plan."
    exit 1
fi

if ! has_remaining_tasks; then
    log_success "All tasks already completed! (${$}(count_tasks))"
    exit 0
fi

log "=============================================="
log "   Ralph Loop - Resuming"
log "=============================================="
log "Max iterations: ${$}MAX_ITERATIONS"
log "Progress: ${$}(count_tasks)"
log "Stop gracefully: touch ${$}STOP_FILE"
echo ""

while [ ${$}ITERATION -lt ${$}MAX_ITERATIONS ]; do
    ITERATION=${$}((ITERATION + 1))
    if [ -f "${$}STOP_FILE" ]; then log_warning "Stop file detected."; rm -f "${$}STOP_FILE"; exit 0; fi
    if ! has_remaining_tasks; then
        echo ""; log_success "=============================================="; log_success "   ALL TASKS COMPLETED! (${$}(count_tasks))"; log_success "=============================================="
        exit 0
    fi
    NEXT_TASK=${$}(get_next_task)
    log "=== Iteration ${$}ITERATION/${$}MAX_ITERATIONS (Progress: ${$}(count_tasks)) ==="
    log "Next task: ${$}NEXT_TASK"
    echo ""

    EXEC_PROMPT_FILE="${$}(mktemp)"
    cat > "${$}EXEC_PROMPT_FILE" << EXEC_EOF
You are an autonomous coding agent in a Ralph Loop - a workflow where EACH TASK runs in a FRESH CONTEXT.

=== CRITICAL: YOU HAVE NO MEMORY OF PREVIOUS SESSIONS ===
All prior work is saved in FILES. You must READ files to understand the current state.

=== YOUR CURRENT TASK ===
${$}NEXT_TASK

=== EXECUTION PROTOCOL ===
STEP 1: ORIENT - Read .ralph/plan.md, Architecture Notes, Technical Context, and existing source files
STEP 2: EXECUTE - Complete the task, follow existing patterns, meet acceptance criteria
STEP 3: VERIFY - Ensure task is FULLY complete
STEP 4: UPDATE - Mark task [x] in plan.md, add to Progress Log and Technical Context
STEP 5: SIGNAL - Run: echo "###RALPH_TASK_COMPLETE###" > .ralph/signal

=== RULES ===
1. Complete ONE task only
2. Do not ask questions - make reasonable decisions
3. When done, signal completion - don't ask 'anything else?'

Begin by reading .ralph/plan.md.
EXEC_EOF

    if run_claude_with_watcher "${$}EXEC_PROMPT_FILE"; then
        log_success "Task completed"
    else
        log_warning "Task session ended"
    fi
    rm -f "${$}EXEC_PROMPT_FILE"
    sleep 2; echo ""
done

log_warning "Max iterations (${$}MAX_ITERATIONS) reached"
if has_remaining_tasks; then
    REMAINING=${$}(grep -c '^- \\[ \\]' "${$}PLAN_FILE" 2>/dev/null || echo 0)
    log_warning "${$}REMAINING tasks remain."
    echo ""; echo -e "  ${$}{GREEN}bash .ralph/resume.sh 10${$}{NC}  # to continue"
    exit 1
fi
log_success "All tasks completed!"
RESUME_SCRIPT_EOF
    chmod +x "${$}RALPH_DIR/resume.sh"
}

# Generate resume script at startup
generate_resume_script

#######################################
# PHASE 1: PLANNING
#######################################
if [ ! -f "${$}PLAN_FILE" ]; then
    log_phase "PHASE 1: PLANNING"
    log "Breaking down task into atomic steps..."
    log "Watch Claude's TUI below:"
    echo ""

    # Write planning prompt to temp file
    PLANNING_PROMPT_FILE="${$}(mktemp)"
    cat > "${$}PLANNING_PROMPT_FILE" << 'PLANNING_EOF'
You are a senior software architect creating a detailed implementation plan for an autonomous coding system.

CRITICAL: This plan will be executed by AI agents with FRESH CONTEXT for each task. Each task must be:
- SELF-CONTAINED: An agent with no memory of previous tasks must be able to complete it
- ATOMIC: One focused unit of work (30-60 min equivalent)
- VERIFIABLE: Clear success criteria so the agent knows when it's done

=== PROJECT DETAILS ===

MAIN GOAL:
${escapedTask}

REQUIREMENTS:
${escapedReqs}

=== PLANNING PHILOSOPHY: MVP FIRST ===

Build a FUNCTIONAL MVP first, then iterate. Avoid over-engineering.

DO:
- Start with the simplest working implementation
- Add complexity only when needed
- Get core functionality working before edge cases
- Use standard libraries/patterns over custom solutions
- Hardcode values initially, make configurable later if needed

DON'T:
- Build elaborate abstractions upfront
- Add features 'just in case'
- Optimize before measuring
- Create complex config systems for simple needs
- Over-architect for hypothetical scale

Structure phases as:
1. Foundation - Minimal setup to start coding
2. Core MVP - Basic working version of main features
3. Refinement - Error handling, edge cases, tests
4. Polish - UX improvements, documentation, nice-to-haves

=== YOUR TASK ===

Create a comprehensive implementation plan in .ralph/plan.md

Consider these aspects (but keep MVP-focused):
1. PROJECT SETUP - Minimal dependencies, basic structure
2. DATA LAYER - Core models only, simple schemas
3. CORE LOGIC - Essential business logic first
4. API/INTERFACE - Key endpoints/screens that deliver value
5. INTEGRATION - Connect the pieces
6. ERROR HANDLING - Basic validation, clear error messages
7. TESTING - Critical path tests, not 100% coverage
8. DOCUMENTATION - README with setup instructions
9. POLISH - Only after MVP works

=== FRONTEND-SPECIFIC GUIDANCE ===

If this project involves frontend/UI work:

DESIGN PRINCIPLES:
- Professional, clean aesthetic - NOT generic AI-generated 'slop'
- Consistent spacing, typography, and color scheme
- Proper visual hierarchy - users should know where to look
- Responsive design - works on mobile and desktop
- Accessible - proper contrast, keyboard navigation, ARIA labels

ARCHITECTURE:
- Component-based structure with clear separation
- Reusable UI components (buttons, inputs, cards)
- Centralized styling (CSS variables, theme, or Tailwind config)
- State management appropriate to complexity (local state for simple, context/store for complex)

TOOLS TO USE:
- Use Playwright MCP for browser testing and visual verification
- Use 21st.dev MCP for high-quality UI component inspiration
- Prefer established UI libraries (shadcn/ui, Radix) over building from scratch

AVOID:
- Rainbow gradients and excessive animations
- Inconsistent spacing (use a spacing scale: 4px, 8px, 16px, 24px, 32px)
- Too many different fonts or colors
- Walls of text without visual breaks
- Generic placeholder content - use realistic examples

=== PLAN FORMAT ===

Write to .ralph/plan.md using this EXACT structure:

# Implementation Plan

## Overview
[2-3 sentences: What we're building, key technologies, architecture approach]

## Architecture Notes
[Key technical decisions that future tasks need to know about]
- [Decision 1: e.g., 'Using PostgreSQL with Prisma ORM']
- [Decision 2: e.g., 'JWT tokens stored in httpOnly cookies']
- [Decision 3: e.g., 'All API responses follow {success, data, error} format']

## Tasks

### Phase 1: Foundation
- [ ] [Task]: [Specific description] | Acceptance: [How to verify it's done]
- [ ] [Task]: [Specific description] | Acceptance: [How to verify it's done]

### Phase 2: Core Features
- [ ] [Task]: [Specific description] | Acceptance: [How to verify it's done]

### Phase 3: Integration & Testing
- [ ] [Task]: [Specific description] | Acceptance: [How to verify it's done]

### Phase 4: Polish & Documentation
- [ ] [Task]: [Specific description] | Acceptance: [How to verify it's done]

## Progress Log
_Task completions will be logged here with timestamps_

## Technical Context
_Agents will add notes here about implementation details for future tasks_

=== EXAMPLES OF GOOD TASKS ===

BAD: '- [ ] Set up authentication'
GOOD: '- [ ] Create JWT utility module with generateToken(userId) and verifyToken(token) functions | Acceptance: Unit tests pass for valid/invalid/expired tokens'

BAD: '- [ ] Add tests'
GOOD: '- [ ] Write integration tests for POST /api/users endpoint covering: valid creation, duplicate email, invalid input | Acceptance: All 3 test cases pass'

BAD: '- [ ] Build the API'
GOOD: '- [ ] Implement GET /api/users/:id endpoint with authentication middleware | Acceptance: Returns user for valid ID, 404 for invalid, 401 for unauthenticated'

=== CONSTRAINTS ===

- Target ${Math.max(8, Math.min(30, maxIterations - 2))} tasks (budget: ${maxIterations} iterations)
- Each task line MUST start with '- [ ] '
- Include acceptance criteria after ' | Acceptance: '
- Order tasks so each can be done with only prior tasks complete
- First 2-3 tasks should be setup (so later tasks have foundation)
- Include test tasks inline (not all at end)

=== CRITICAL: SIGNAL COMPLETION ===

When you have COMPLETED the plan and written it to .ralph/plan.md, you MUST signal the orchestrator by running this EXACT command:

echo "###RALPH_TASK_COMPLETE###" > .ralph/signal

This tells the orchestrator you are finished. After running this command, the session will end automatically.

Begin by creating .ralph/plan.md now.
PLANNING_EOF

    # Run Claude with watcher
    if run_claude_with_watcher "${$}PLANNING_PROMPT_FILE"; then
        log_success "Planning phase completed"
    else
        log_warning "Planning session ended (stop token may not have been detected)"
    fi

    rm -f "${$}PLANNING_PROMPT_FILE"

    # Verify plan was created
    if [ ! -f "${$}PLAN_FILE" ]; then
        log_error "Plan file was not created. Please check Claude's output."
        exit 1
    fi

    log ""
    log "Plan created with ${$}(grep -c '^- \\[ \\]' "${$}PLAN_FILE" 2>/dev/null || echo 0) tasks"
    log ""
    sleep 2
fi

#######################################
# PHASE 2: EXECUTION
#######################################
log_phase "PHASE 2: EXECUTION"
log "Executing tasks with fresh context per task..."
log "Full TUI visible for each Claude session!"
echo ""

while [ ${$}ITERATION -lt ${$}MAX_ITERATIONS ]; do
    ITERATION=${$}((ITERATION + 1))

    # Check for stop signal
    if [ -f "${$}STOP_FILE" ]; then
        log_warning "Stop file detected. Exiting gracefully..."
        rm -f "${$}STOP_FILE"
        exit 0
    fi

    # Check if all tasks are done
    if ! has_remaining_tasks; then
        echo ""
        log_success "=============================================="
        log_success "   ALL TASKS COMPLETED!"
        log_success "   (${$}(count_tasks) tasks done)"
        log_success "=============================================="
        exit 0
    fi

    NEXT_TASK=${$}(get_next_task)
    log "=== Iteration ${$}ITERATION/${$}MAX_ITERATIONS (Progress: ${$}(count_tasks)) ==="
    log "Next task: ${$}NEXT_TASK"
    log "Starting FRESH Claude session with TUI..."
    echo ""

    # Write execution prompt to temp file
    EXEC_PROMPT_FILE="${$}(mktemp)"
    cat > "${$}EXEC_PROMPT_FILE" << EXEC_EOF
You are an autonomous coding agent in a Ralph Loop - a workflow where EACH TASK runs in a FRESH CONTEXT.

=== CRITICAL: YOU HAVE NO MEMORY OF PREVIOUS SESSIONS ===
All prior work is saved in FILES. You must READ files to understand the current state.
Do not assume anything - verify by reading.

=== YOUR CURRENT TASK ===
${$}NEXT_TASK

=== EXECUTION PROTOCOL ===

STEP 1: ORIENT (Read files to understand context)
- Read .ralph/plan.md for the full plan and what's already done
- Read the 'Architecture Notes' and 'Technical Context' sections carefully
- Read existing source files to understand the codebase structure
- Identify what this task builds upon

STEP 2: EXECUTE (Complete the task thoroughly)
- Implement the task according to its description
- Follow patterns established in existing code
- Write clean, documented code with proper error handling
- If the task includes tests, write them and verify they pass
- Check the 'Acceptance' criteria - ensure you meet them

FOR FRONTEND TASKS:
- Use Playwright MCP to verify UI works correctly in browser
- Use 21st.dev MCP for component inspiration if building UI
- Follow the design system/theme established in the project
- Ensure responsive design (test at mobile and desktop widths)
- No 'AI slop' - professional, consistent, clean aesthetics
- Use proper spacing scale, typography hierarchy, color consistency

STEP 3: VERIFY (Confirm the task is complete)
- Re-read the acceptance criteria from the task
- Run any relevant tests or verification commands
- Ensure the task is FULLY complete, not partially done

STEP 4: UPDATE (Record progress)
- In .ralph/plan.md, change this task from '- [ ]' to '- [x]'
- Add a timestamped entry to the 'Progress Log' section:
  '[DATE] Completed: [task summary] - [brief notes about implementation]'
- If future tasks need to know something, add it to 'Technical Context'

STEP 5: SIGNAL COMPLETION
When you have FULLY COMPLETED the task and updated plan.md, signal the orchestrator:

Run this EXACT command: echo "###RALPH_TASK_COMPLETE###" > .ralph/signal

This tells the orchestrator you are finished. After running this command, the session will end automatically.

=== IMPORTANT RULES ===

1. Complete ONE task only - the one listed above
2. Do not start the next task - a fresh session will handle it
3. Do not ask questions - make reasonable decisions and document them
4. When done, run 'echo "###RALPH_TASK_COMPLETE###" > .ralph/signal' - don't ask 'anything else?'
5. If task is unclear, do your best interpretation and note it in Progress Log

=== CURRENT STATUS ===
Iteration: ${$}ITERATION of ${$}MAX_ITERATIONS

Begin now by reading .ralph/plan.md to orient yourself.
EXEC_EOF

    # Run Claude with watcher
    if run_claude_with_watcher "${$}EXEC_PROMPT_FILE"; then
        log_success "Task completed successfully"
    else
        log_warning "Task session ended (checking if task was marked complete...)"
    fi

    rm -f "${$}EXEC_PROMPT_FILE"

    # Small delay between iterations
    sleep 2
    echo ""
done

log_warning "Max iterations (${$}MAX_ITERATIONS) reached"
if has_remaining_tasks; then
    REMAINING=${$}(grep -c '^- \\[ \\]' "${$}PLAN_FILE" 2>/dev/null || echo 0)
    log_warning "${$}REMAINING tasks remain incomplete."
    echo ""
    log "To resume, run one of these commands:"
    echo ""
    echo -e "  ${$}{CYAN}# Resume with 10 more iterations:${$}{NC}"
    echo -e "  ${$}{GREEN}cd ${$}(pwd) && bash .ralph/resume.sh 10${$}{NC}"
    echo ""
    echo -e "  ${$}{CYAN}# Or specify a different number:${$}{NC}"
    echo -e "  ${$}{GREEN}cd ${$}(pwd) && bash .ralph/resume.sh <iterations>${$}{NC}"
    echo ""
    exit 1
else
    log_success "All tasks completed!"
    exit 0
fi
`;

  return script;
}

/**
 * Get list of available terminal apps
 */
export async function getAvailableTerminals(): Promise<TerminalApp[]> {
  const terminals: TerminalApp[] = ["Terminal"]; // Always available

  const checks: [string, TerminalApp][] = [
    ["iTerm", "iTerm"],
    ["Warp", "Warp"],
    ["kitty", "kitty"],
    ["Ghostty", "Ghostty"],
  ];

  for (const [appName, terminal] of checks) {
    try {
      await execFilePromise("osascript", [
        "-e",
        `id of application "${appName}"`,
      ]);
      terminals.push(terminal);
    } catch {
      // App not installed
    }
  }

  return terminals;
}
