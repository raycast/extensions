#!/bin/bash

# Enable debug logging
defaults write com.raycast.macos LogLevel -string "debug"

# Function to get Raycast PID
get_raycast_pid() {
    pgrep -f "Raycast"
}

# Function to measure command execution time
measure_command() {
    local start=$(date +%s%N)
    "$@"
    local end=$(date +%s%N)
    local duration=$((($end - $start) / 1000000)) # Convert to milliseconds
    echo "$duration ms"
}

# Function to monitor memory usage
monitor_memory() {
    local pid=$1
    local duration=$2
    local interval=1
    
    for ((i=0; i<duration; i++)); do
        ps -o rss,vsz -p $pid
        sleep $interval
    done
}

# Function to monitor CPU usage
monitor_cpu() {
    local pid=$1
    local duration=$2
    
    top -pid $pid -l $duration -stats cpu
}

# Function to monitor network calls
monitor_network() {
    local pid=$1
    local duration=$2
    
    sudo dtrace -n "syscall::*recv*:entry /pid == $pid/ { @[probefunc] = count(); }" -c "sleep $duration"
}

# Main test sequence
main() {
    echo "Starting Performance Tests..."
    echo "=============================="
    
    # Get Raycast PID
    RAYCAST_PID=$(get_raycast_pid)
    if [ -z "$RAYCAST_PID" ]; then
        echo "Error: Raycast not running"
        exit 1
    fi
    
    # Record environment
    echo "Test Environment:"
    echo "macOS Version: $(sw_vers -productVersion)"
    echo "Hardware: $(sysctl -n machdep.cpu.brand_string)"
    echo "Memory: $(sysctl -n hw.memsize | awk '{print $0/1024/1024/1024 "GB"}')"
    echo "Date: $(date)"
    echo
    
    # Baseline measurements
    echo "Baseline Measurements:"
    echo "Memory Usage:"
    ps -o rss,vsz -p $RAYCAST_PID
    echo
    echo "CPU Usage:"
    top -pid $RAYCAST_PID -l 1 -stats cpu
    echo
    
    # Command response times
    echo "Command Response Times:"
    echo "----------------------"
    echo "Toggle Microphone: $(measure_command raycast toggle-microphone)"
    sleep 1
    echo "Toggle Video: $(measure_command raycast toggle-video)"
    sleep 1
    echo "Show Status: $(measure_command raycast show-status)"
    echo
    
    # Extended monitoring
    echo "Extended Monitoring (30s):"
    echo "-------------------------"
    echo "Memory Usage:"
    monitor_memory $RAYCAST_PID 30
    echo
    echo "CPU Usage:"
    monitor_cpu $RAYCAST_PID 30
    echo
    echo "Network Activity:"
    monitor_network $RAYCAST_PID 30
    echo
    
    # Cleanup
    defaults delete com.raycast.macos LogLevel
    
    echo "Performance Test Complete"
    echo "========================"
}

# Run tests
main | tee "performance-test-$(date +%Y%m%d-%H%M%S).log" 