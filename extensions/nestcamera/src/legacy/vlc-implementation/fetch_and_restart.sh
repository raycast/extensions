#!/bin/bash

set -e

# Set PATH to include common binary locations
export PATH=/opt/homebrew/bin:/usr/gnu/bin:/usr/local/bin:/bin:/usr/bin:.

# Enable debug output
set -x

# Print environment variables (excluding sensitive data)
env | grep -v 'auth=' | grep -v 'token='

# Cleanup function must be defined before it's used in trap
cleanup() {
  local exit_code=${1:-$?}
  echo "Cleaning up, exit code: $exit_code"
  if [ -n "$FFMPEG_PID" ]; then
    echo "Killing ffmpeg process $FFMPEG_PID"
    kill $FFMPEG_PID 2>/dev/null || true
  fi
}

# Signal handlers
trap 'cleanup; exit 143' SIGTERM
trap 'cleanup; exit 130' SIGINT
trap 'cleanup; exit 129' SIGHUP
trap cleanup EXIT

# Kill any existing ffmpeg processes
pkill -f ffmpeg || true

# Wait for processes to fully terminate
sleep 1

# Get the source URL from environment variable
if [ -z "$NEST_SOURCE_URL" ]; then
  echo "Error: No source URL provided in NEST_SOURCE_URL environment variable"
  echo "Available environment variables:"
  env | grep -v 'auth=' | grep -v 'token='
  exit 1
fi

echo "Starting stream relay from Nest camera..."
echo "Source URL length: ${#NEST_SOURCE_URL}"

# Path to ffmpeg
FFMPEG_PATH=/opt/homebrew/bin/ffmpeg

# Check if ffmpeg exists and is executable
if [ ! -x "$FFMPEG_PATH" ]; then
  echo "ffmpeg not found or not executable at $FFMPEG_PATH"
  exit 1
fi

# Function to start ffmpeg with retry logic
start_ffmpeg() {
  local retry_count=0
  local max_retries=3
  local retry_delay=2

  while [ $retry_count -lt $max_retries ]; do
    if [ $retry_count -gt 0 ]; then
      echo "Retry attempt $retry_count after $retry_delay seconds..."
      sleep $retry_delay
      retry_delay=$((retry_delay * 2))
    fi

    echo "Starting ffmpeg..."
    
    # Start ffmpeg with improved options for RTSP streaming
    $FFMPEG_PATH \
      -hide_banner \
      -loglevel warning \
      -nostdin \
      -fflags +genpts \
      -rtsp_transport tcp \
      -protocol_whitelist file,crypto,tcp,udp,tls,rtsp,rtsps \
      -tls_verify 0 \
      -rtsp_flags prefer_tcp \
      -use_wallclock_as_timestamps 1 \
      -avoid_negative_ts make_zero \
      -reconnect 1 \
      -reconnect_at_eof 1 \
      -reconnect_streamed 1 \
      -reconnect_delay_max 2 \
      -analyzeduration 15000000 \
      -probesize 15000000 \
      -rw_timeout 15000000 \
      -headers "User-Agent: Nest/1.0\r\nAccept: */*\r\nConnection: keep-alive\r\n" \
      -i "$NEST_SOURCE_URL" \
      -c copy \
      -f rtsp \
      -rtsp_transport tcp \
      rtsp://127.0.0.1:8554/camera &
    
    FFMPEG_PID=$!
    echo "Started ffmpeg with PID: $FFMPEG_PID"
    
    # Wait for ffmpeg to exit
    wait $FFMPEG_PID
    local exit_code=$?
    
    # Check if ffmpeg exited successfully
    if [ $exit_code -eq 0 ]; then
      echo "ffmpeg completed successfully"
      return 0
    fi
    
    echo "ffmpeg failed with exit code $exit_code"
    retry_count=$((retry_count + 1))
  done
  
  echo "Failed to start stream after $max_retries attempts"
  return 1
}

# Start ffmpeg with retry logic
start_ffmpeg 