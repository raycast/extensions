#!/bin/bash

# Function to print usage information
usage() {
    echo "Usage: $0 [--sudo] <process_name>"
    echo "Examples:"
    echo "  $0 Finder                   # Restart Finder"
    echo "  $0 com.apple.WindowServer   # Restart WindowServer using service name"
    echo "  $0 --sudo org.cups.cupsd    # Restart CUPS printing service with sudo"
    exit 1
}

# Check if any arguments were provided
if [ $# -eq 0 ]; then
    usage
fi

# Initialize variables
USE_SUDO=false
PROCESS_NAME=""

# Parse arguments
while [ "$1" != "" ]; do
    case $1 in
        --sudo )        USE_SUDO=true
                        ;;
        * )             if [ "$PROCESS_NAME" = "" ]; then
                            PROCESS_NAME="$1"
                        else
                            echo "Error: Too many arguments provided."
                            usage
                        fi
                        ;;
    esac
    shift
done

# Check if a process name was provided
if [ -z "$PROCESS_NAME" ]; then
    echo "Error: No process name provided."
    usage
fi

# Function to execute commands with or without sudo
execute_cmd() {
    if [ "$USE_SUDO" = true ]; then
        sudo "$@"
    else
        "$@"
    fi
}

# Function to log success
success() {
    echo "✅ Success: $1"
    exit 0
}

# Function to log error
error() {
    echo "❌ Error: $1"
    exit 1
}

# Function to log info
info() {
    echo "ℹ️ $1"
}

# Special case for common applications that can be restarted with killall
restart_app() {
    local app="$1"
    info "Restarting $app using killall..."
    execute_cmd killall "$app" 2>/dev/null
    if [ $? -eq 0 ]; then
        success "$app has been restarted."
    else
        error "Failed to restart $app. Is it running?"
    fi
}

# Handle special cases for common applications
case "$PROCESS_NAME" in
    "Finder" | "com.apple.Finder")
        restart_app "Finder"
        ;;
    "Dock" | "com.apple.dock")
        restart_app "Dock"
        ;;
    "SystemUIServer" | "com.apple.SystemUIServer")
        restart_app "SystemUIServer"
        ;;
    "ControlCenter" | "com.apple.controlcenter")
        restart_app "ControlCenter"
        ;;
esac

# Check if process exists in launchctl list
process_exists() {
    local count=0
    if [ "$USE_SUDO" = true ]; then
        count=$(sudo launchctl list | grep -c "$1")
    else
        count=$(launchctl list | grep -c "$1")
    fi

    if [ "$count" -gt 0 ]; then
        return 0  # Process exists
    else
        return 1  # Process doesn't exist
    fi
}

# Try to find service in a domain
check_domain_service() {
    local domain="$1"
    local service="$2"

    if execute_cmd launchctl print "$domain/$service" >/dev/null 2>&1; then
        return 0  # Found
    else
        return 1  # Not found
    fi
}

# Function to restart service using domain
restart_domain_service() {
    local domain="$1"
    local service="$2"

    info "Attempting to restart service in domain: $domain/$service"

    # Try kickstart (best method for macOS 10.10+)
    if execute_cmd launchctl kickstart -k "$domain/$service" 2>/dev/null; then
        success "Restarted $service in domain $domain using kickstart."
    fi

    # If kickstart fails, try disable/enable
    info "Kickstart failed, trying disable/enable method..."
    execute_cmd launchctl disable "$domain/$service" 2>/dev/null
    execute_cmd launchctl kill SIGTERM "$domain/$service" 2>/dev/null
    sleep 1
    execute_cmd launchctl enable "$domain/$service" 2>/dev/null
    execute_cmd launchctl start "$domain/$service" 2>/dev/null
    sleep 1

    # Verify service is running
    if check_domain_service "$domain" "$service"; then
        success "Restarted $service in domain $domain using disable/enable."
    else
        info "Service may have been restarted, but could not verify."
        return 1
    fi
}

# Function to restart service using plist
restart_plist_service() {
    local plist="$1"

    info "Attempting to restart service using plist: $plist"

    execute_cmd launchctl unload -w "$plist" 2>/dev/null
    sleep 1
    if execute_cmd launchctl load -w "$plist" 2>/dev/null; then
        success "Restarted service using plist file: $plist"
    else
        info "Attempted to restart using plist but could not verify success."
        return 1
    fi
}

# Main logic - attempt various restart methods

# Method 1: Check if process exists directly in list
info "Looking for $PROCESS_NAME in launchctl list..."
if process_exists "$PROCESS_NAME"; then
    info "Found service: $PROCESS_NAME"

    # Try kickstart (best method for macOS 10.10+)
    if execute_cmd launchctl kickstart -k "$PROCESS_NAME" 2>/dev/null; then
        success "Restarted $PROCESS_NAME using kickstart."
    fi

    # Try bootstrap (for older macOS versions)
    info "Kickstart failed, trying bootstrap..."
    execute_cmd launchctl bootstrap system /System/Library/LaunchDaemons/$PROCESS_NAME.plist 2>/dev/null
    if [ $? -eq 0 ]; then
        success "Restarted $PROCESS_NAME using bootstrap."
    fi

    # Try stop/start
    info "Bootstrap failed, trying stop/start..."
    execute_cmd launchctl stop "$PROCESS_NAME" 2>/dev/null
    sleep 1
    execute_cmd launchctl start "$PROCESS_NAME" 2>/dev/null
    sleep 1

    if process_exists "$PROCESS_NAME"; then
        success "Restarted $PROCESS_NAME using stop/start."
    else
        info "Attempted to restart but could not verify success."
    fi
fi

# Method 2: Try with domains (macOS 10.10+)
info "Checking for service in domains..."

DOMAINS=()
if [ "$USE_SUDO" = true ]; then
    DOMAINS+=("system")
fi
DOMAINS+=("user/$(id -u)" "gui/$(id -u)")

for DOMAIN in "${DOMAINS[@]}"; do
    if check_domain_service "$DOMAIN" "$PROCESS_NAME"; then
        restart_domain_service "$DOMAIN" "$PROCESS_NAME"
        # If we get here, restart_domain_service didn't exit with success
        # Let's continue to the next method
    fi
done

# Method 3: Try with plist files
info "Checking for plist files..."

PLIST_LOCATIONS=(
    "/Library/LaunchDaemons/$PROCESS_NAME.plist"
    "/Library/LaunchAgents/$PROCESS_NAME.plist"
    "$HOME/Library/LaunchAgents/$PROCESS_NAME.plist"
    "/System/Library/LaunchDaemons/$PROCESS_NAME.plist"
    "/System/Library/LaunchAgents/$PROCESS_NAME.plist"
)

for PLIST in "${PLIST_LOCATIONS[@]}"; do
    if [ -f "$PLIST" ]; then
        restart_plist_service "$PLIST"
        # If we get here, restart_plist_service didn't exit with success
    fi
done

# Method 4: Try extracting PID and using kill for stubborn processes
info "Trying to restart using PID extraction..."
if [ "$USE_SUDO" = true ]; then
    PID=$(sudo launchctl list | grep "$PROCESS_NAME" | awk '{print $1}')
else
    PID=$(launchctl list | grep "$PROCESS_NAME" | awk '{print $1}')
fi

if [[ "$PID" =~ ^[0-9]+$ ]]; then
    info "Found process with PID: $PID"
    execute_cmd kill -9 "$PID" 2>/dev/null
    sleep 1
    execute_cmd launchctl start "$PROCESS_NAME" 2>/dev/null
    if process_exists "$PROCESS_NAME"; then
        success "Restarted $PROCESS_NAME by killing PID and restarting."
    fi
fi

# If we get here, we couldn't find or restart the service
if [ "$USE_SUDO" = false ]; then
    info "Could not find or restart service. If this is a system service, try using --sudo."
else
    error "Could not find or restart service '$PROCESS_NAME'. Please verify the service name."
fi

exit 1