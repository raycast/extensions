#!/bin/bash
# Mole - Timeout Control
# Command execution with timeout support

set -euo pipefail

# Prevent multiple sourcing
if [[ -n "${MOLE_TIMEOUT_LOADED:-}" ]]; then
    return 0
fi
readonly MOLE_TIMEOUT_LOADED=1

# ============================================================================
# Timeout Command Initialization
# ============================================================================

# Initialize timeout command (prefer gtimeout from coreutils, fallback to timeout)
# Sets MO_TIMEOUT_BIN to the available timeout command
#
# Recommendation: Install coreutils for reliable timeout support
#   brew install coreutils
#
# The shell-based fallback has known limitations:
#   - May not clean up all child processes
#   - Has race conditions in edge cases
#   - Less reliable than native timeout command
if [[ -z "${MO_TIMEOUT_INITIALIZED:-}" ]]; then
    MO_TIMEOUT_BIN=""
    for candidate in gtimeout timeout; do
        if command -v "$candidate" > /dev/null 2>&1; then
            MO_TIMEOUT_BIN="$candidate"
            if [[ "${MO_DEBUG:-0}" == "1" ]]; then
                echo "[TIMEOUT] Using command: $candidate" >&2
            fi
            break
        fi
    done

    # Log warning if no timeout command available
    if [[ -z "$MO_TIMEOUT_BIN" ]] && [[ "${MO_DEBUG:-0}" == "1" ]]; then
        echo "[TIMEOUT] No timeout command found, using shell fallback" >&2
        echo "[TIMEOUT] Install coreutils for better reliability: brew install coreutils" >&2
    fi

    export MO_TIMEOUT_INITIALIZED=1
fi

# ============================================================================
# Timeout Execution
# ============================================================================

# Run command with timeout
# Uses gtimeout/timeout if available, falls back to shell-based implementation
#
# Args:
#   $1 - duration in seconds (0 or invalid = no timeout)
#   $@ - command and arguments to execute
#
# Returns:
#   Command exit code, or 124 if timed out (matches gtimeout behavior)
#
# Environment:
#   MO_DEBUG - Set to 1 to enable debug logging to stderr
#
# Implementation notes:
#   - Prefers gtimeout (coreutils) or timeout for reliability
#   - Shell fallback uses SIGTERM → SIGKILL escalation
#   - Attempts process group cleanup to handle child processes
#   - Returns exit code 124 on timeout (standard timeout exit code)
#
# Known limitations of shell-based fallback:
#   - Race condition: If command exits during signal delivery, the signal
#     may target a reused PID (very rare, requires quick PID reuse)
#   - Zombie processes: Brief zombies until wait completes
#   - Nested children: SIGKILL may not reach all descendants
#   - No process group: Cannot guarantee cleanup of detached children
#
# For mission-critical timeouts, install coreutils.
run_with_timeout() {
    local duration="${1:-0}"
    shift || true

    # No timeout if duration is invalid or zero
    if [[ ! "$duration" =~ ^[0-9]+(\.[0-9]+)?$ ]] || [[ $(echo "$duration <= 0" | bc -l 2> /dev/null) -eq 1 ]]; then
        "$@"
        return $?
    fi

    # Use timeout command if available (preferred path)
    if [[ -n "${MO_TIMEOUT_BIN:-}" ]]; then
        if [[ "${MO_DEBUG:-0}" == "1" ]]; then
            echo "[TIMEOUT] Running with ${duration}s timeout: $*" >&2
        fi
        "$MO_TIMEOUT_BIN" "$duration" "$@"
        return $?
    fi

    # ========================================================================
    # Shell-based fallback implementation
    # ========================================================================

    if [[ "${MO_DEBUG:-0}" == "1" ]]; then
        echo "[TIMEOUT] Shell fallback (${duration}s): $*" >&2
    fi

    # Start command in background
    "$@" &
    local cmd_pid=$!

    # Start timeout killer in background
    (
        # Wait for timeout duration
        sleep "$duration"

        # Check if process still exists
        if kill -0 "$cmd_pid" 2> /dev/null; then
            # Try to kill process group first (negative PID), fallback to single process
            # Process group kill is best effort - may not work if setsid was used
            kill -TERM -"$cmd_pid" 2> /dev/null || kill -TERM "$cmd_pid" 2> /dev/null || true

            # Grace period for clean shutdown
            sleep 2

            # Escalate to SIGKILL if still alive
            if kill -0 "$cmd_pid" 2> /dev/null; then
                kill -KILL -"$cmd_pid" 2> /dev/null || kill -KILL "$cmd_pid" 2> /dev/null || true
            fi
        fi
    ) &
    local killer_pid=$!

    # Wait for command to complete
    local exit_code=0
    set +e
    wait "$cmd_pid" 2> /dev/null
    exit_code=$?
    set -e

    # Clean up killer process
    if kill -0 "$killer_pid" 2> /dev/null; then
        kill "$killer_pid" 2> /dev/null || true
        wait "$killer_pid" 2> /dev/null || true
    fi

    # Check if command was killed by timeout (exit codes 143=SIGTERM, 137=SIGKILL)
    if [[ $exit_code -eq 143 || $exit_code -eq 137 ]]; then
        # Command was killed by timeout
        if [[ "${MO_DEBUG:-0}" == "1" ]]; then
            echo "[TIMEOUT] Command timed out after ${duration}s" >&2
        fi
        return 124
    fi

    # Command completed normally (or with its own error)
    return "$exit_code"
}
