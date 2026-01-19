#!/bin/bash
# Mole - CLI App Scanner (no TUI)
# Outputs app list in pipe-delimited format for Raycast integration.
# Output format: epoch|app_path|display_name|bundle_id|size_human|last_used|size_kb

set -euo pipefail
export LC_ALL=C
export LANG=C

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/core/common.sh"

# Scan applications and output to stdout
scan_applications_cli() {
    local current_epoch
    current_epoch=$(get_epoch_seconds)

    # Collect app paths and bundle IDs
    local -a app_data_tuples=()
    local -a app_dirs=(
        "/Applications"
        "$HOME/Applications"
        "/Library/Input Methods"
        "$HOME/Library/Input Methods"
    )
    
    local nullglob_was_set=0
    shopt -q nullglob && nullglob_was_set=1
    shopt -s nullglob
    
    for vol_app_dir in /Volumes/*/Applications; do
        [[ -d "$vol_app_dir" && -r "$vol_app_dir" ]] || continue
        if [[ -d "/Applications" && "$vol_app_dir" -ef "/Applications" ]]; then
            continue
        fi
        if [[ -d "$HOME/Applications" && "$vol_app_dir" -ef "$HOME/Applications" ]]; then
            continue
        fi
        app_dirs+=("$vol_app_dir")
    done
    
    [[ $nullglob_was_set -eq 0 ]] && shopt -u nullglob

    # Scan apps
    for dir in "${app_dirs[@]}"; do
        [[ ! -d "$dir" || ! -r "$dir" ]] && continue
        
        while IFS= read -r -d '' app_path; do
            local bundle_id="unknown"
            local plist="$app_path/Contents/Info.plist"
            
            if [[ -f "$plist" ]]; then
                bundle_id=$(/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "$plist" 2>/dev/null || echo "unknown")
            fi
            
            # Check if protected
            if is_system_critical_app "$bundle_id" "$app_path"; then
                continue
            fi
            
            app_data_tuples+=("$app_path|$bundle_id")
        done < <(find "$dir" -maxdepth 1 -name "*.app" -type d -print0 2>/dev/null)
    done

    # Process each app to get metadata
    for tuple in "${app_data_tuples[@]}"; do
        IFS='|' read -r app_path bundle_id <<< "$tuple"
        
        local display_name
        display_name=$(basename "$app_path" .app)
        
        # Get app size
        local size_kb=0
        if [[ -d "$app_path" ]]; then
            size_kb=$(du -sk "$app_path" 2>/dev/null | awk '{print $1}' || echo "0")
        fi
        
        local size_human
        if [[ $size_kb -ge 1048576 ]]; then
            size_human=$(awk "BEGIN {printf \"%.1f GB\", $size_kb/1048576}")
        elif [[ $size_kb -ge 1024 ]]; then
            size_human=$(awk "BEGIN {printf \"%.1f MB\", $size_kb/1024}")
        else
            size_human="${size_kb} KB"
        fi
        
        # Get last used date
        local last_used="Never"
        if command -v mdls &>/dev/null; then
            local last_used_date
            last_used_date=$(mdls -name kMDItemLastUsedDate -raw "$app_path" 2>/dev/null || echo "(null)")
            if [[ "$last_used_date" != "(null)" && -n "$last_used_date" ]]; then
                if command -v date &>/dev/null; then
                    last_used=$(date -j -f "%Y-%m-%d %H:%M:%S %z" "$last_used_date" "+%Y-%m-%d" 2>/dev/null || echo "Unknown")
                fi
            fi
        fi
        
        # Output: epoch|path|name|bundle|size|last_used|size_kb
        echo "$current_epoch|$app_path|$display_name|$bundle_id|$size_human|$last_used|$size_kb"
    done
}

# Main execution
scan_applications_cli
