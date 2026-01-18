#!/bin/bash
# Ralph Loop - Autonomous AI coding loop
# Usage: ./loop.sh [plan] [max_iterations]
# Examples:
#   ./loop.sh              # Build mode, unlimited iterations
#   ./loop.sh 20           # Build mode, max 20 iterations
#   ./loop.sh plan         # Plan mode, unlimited iterations
#   ./loop.sh plan 5       # Plan mode, max 5 iterations

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/loop.log"

# Log to file and stdout
exec > >(tee -a "$LOG_FILE") 2>&1

# System stats function
show_stats() {
    # CPU usage (macOS)
    CPU=$(top -l 1 -n 0 2>/dev/null | grep "CPU usage" | awk '{print $3}' | tr -d '%') || CPU="--"

    # Memory usage (macOS)
    MEM_USED=$(vm_stat 2>/dev/null | awk '/Pages active/ {active=$3} /Pages wired/ {wired=$3} END {printf "%.0f", (active+wired)*4096/1024/1024/1024}') || MEM_USED="--"
    MEM_TOTAL=$(sysctl -n hw.memsize 2>/dev/null | awk '{printf "%.0f", $1/1024/1024/1024}') || MEM_TOTAL="--"

    # Network (bytes in/out since boot, simplified)
    NET=$(netstat -ib 2>/dev/null | awk '/en0/ && NR==1 {printf "↓%.1fG ↑%.1fG", $7/1024/1024/1024, $10/1024/1024/1024}') || NET="--"

    echo "  CPU: ${CPU}% | RAM: ${MEM_USED}/${MEM_TOTAL}GB | Net: $NET"
}

# Parse arguments
if [ "$1" = "plan" ]; then
    MODE="plan"
    PROMPT_FILE="PROMPT_plan.md"
    MAX_ITERATIONS=${2:-0}
elif [[ "$1" =~ ^[0-9]+$ ]]; then
    MODE="build"
    PROMPT_FILE="PROMPT_build.md"
    MAX_ITERATIONS=$1
else
    MODE="build"
    PROMPT_FILE="PROMPT_build.md"
    MAX_ITERATIONS=0
fi

ITERATION=0
CURRENT_BRANCH=$(git branch --show-current)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Ralph Loop - $(date)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Mode:   $MODE"
echo "  Prompt: $PROMPT_FILE"
echo "  Branch: $CURRENT_BRANCH"
[ $MAX_ITERATIONS -gt 0 ] && echo "  Max:    $MAX_ITERATIONS iterations"
echo "  Log:    $LOG_FILE"
show_stats
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verify prompt file exists
if [ ! -f "$PROMPT_FILE" ]; then
    echo "Error: $PROMPT_FILE not found"
    exit 1
fi

# Track start time
START_TIME=$(date +%s)

while true; do
    if [ $MAX_ITERATIONS -gt 0 ] && [ $ITERATION -ge $MAX_ITERATIONS ]; then
        ELAPSED=$(( $(date +%s) - START_TIME ))
        ELAPSED_MIN=$(( ELAPSED / 60 ))
        ELAPSED_SEC=$(( ELAPSED % 60 ))
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "  Reached max iterations: $MAX_ITERATIONS"
        echo "  Total time: ${ELAPSED_MIN}m ${ELAPSED_SEC}s"
        echo "  Check IMPLEMENTATION_PLAN.md for status"
        show_stats
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        break
    fi

    ITERATION=$((ITERATION + 1))
    ITER_START=$(date +%s)

    echo ""
    echo "═══════════════════════════════════════════════════════"
    echo "  Iteration $ITERATION$([ $MAX_ITERATIONS -gt 0 ] && echo " of $MAX_ITERATIONS") - $(date '+%H:%M:%S')"
    show_stats
    echo "═══════════════════════════════════════════════════════"

    # Run codex with piped prompt
    cat "$PROMPT_FILE" | codex exec \
        --dangerously-bypass-approvals-and-sandbox 2>&1 | tee /dev/stderr || true

    # Show iteration duration
    ITER_ELAPSED=$(( $(date +%s) - ITER_START ))
    ITER_MIN=$(( ITER_ELAPSED / 60 ))
    ITER_SEC=$(( ITER_ELAPSED % 60 ))

    # Push changes after each iteration
    git push origin "$CURRENT_BRANCH" 2>/dev/null || \
        git push -u origin "$CURRENT_BRANCH" 2>/dev/null || true

    echo ""
    echo "  ✓ Iteration $ITERATION complete (${ITER_MIN}m ${ITER_SEC}s)"
    show_stats
    sleep 2
done
