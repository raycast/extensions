#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Whisper Voice Input (parametrized)
# @raycast.mode silent
# @raycast.icon 🤖
#
# Documentation:
# @raycast.description Record X seconds of audio, transcribe with whisper-cpp, enforce UTF-8, and paste back using cliclick
# @raycast.author kochi_chuang
# @raycast.authorURL https://raycast.com/kochi_chuang

################################################################################
# Usage:
#   • brew install ffmpeg whisper-cpp terminal-notifier cliclick
#   • curl -L -o ~/whisper-models/ggml-medium.bin \
#       https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin
#   • Grant Accessibility permissions for Raycast (for cliclick & AppleScript)
#   • Set this file as a Raycast Script Command (mode: silent), assign a hotkey
#   • Press hotkey in any app → records audio, transcribes, pastes text via Cmd+V
################################################################################

set -e

# --------------------------
# Default parameter values
# --------------------------
DURATION=5                    # Recording duration in seconds
LANGUAGE="zh"               # Whisper language (e.g. zh, en)
MODEL_PATH="$HOME/whisper-models/ggml-medium.bin"  # Path to model file
TMP_DIR="$HOME/whisper_temp"  # Temp directory for audio/text
SENDER_BUNDLE="com.raycast.macos"  # terminal-notifier sender bundle

# --------------------------
# Parse command-line options
# --------------------------
while getopts "d:l:m:t:s:" opt; do
  case $opt in
    d) DURATION="$OPTARG" ;;    # -d duration
    l) LANGUAGE="$OPTARG" ;;    # -l language code
    m) MODEL_PATH="$OPTARG" ;;  # -m model file path
    t) TMP_DIR="$OPTARG" ;;     # -t temp directory
    s) SENDER_BUNDLE="$OPTARG" ;;# -s sender bundle ID
    *) echo "Usage: $0 [-d seconds] [-l language] [-m model_path] [-t tmp_dir] [-s sender]"; exit 1 ;;
  esac
done

# --------------------------
# Ensure defaults if not provided
# --------------------------
DURATION=${DURATION:-5}
LANGUAGE=${LANGUAGE:-"zh"}
MODEL_PATH=${MODEL_PATH:-"$HOME/whisper-models/ggml-medium.bin"}
TMP_DIR=${TMP_DIR:-"$HOME/whisper_temp"}
SENDER_BUNDLE=${SENDER_BUNDLE:-"com.raycast.macos"}

# Force UTF-8 locale
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# Prepare file paths
audio_file="$TMP_DIR/input.wav"
output_prefix="$TMP_DIR/output"
txt_file="$output_prefix.txt"

# Create temp dir and clean old files
mkdir -p "$TMP_DIR"
rm -f "$audio_file" "$output_prefix".*

# Remember frontmost application
active_app=$(osascript -e '
  tell application "System Events"
    get name of first application process whose frontmost is true
  end tell'
)

# Notify: start recording
/opt/homebrew/bin/terminal-notifier \
  -title "Whisper Voice Input" \
  -message "🎤 Recording ${DURATION}s..." \
  -sender "$SENDER_BUNDLE" > /dev/null 2>&1

# Record audio
echo "Recording to $audio_file..."
/opt/homebrew/bin/ffmpeg -f avfoundation -i ":0" -t "$DURATION" "$audio_file" -y -loglevel error

# Notify: start transcribing
/opt/homebrew/bin/terminal-notifier \
  -title "Whisper Voice Input" \
  -message "🧠 Transcribing..." \
  -sender "$SENDER_BUNDLE" > /dev/null 2>&1

# Transcribe with whisper-cpp
/opt/homebrew/bin/whisper-cpp \
  --language "$LANGUAGE" \
  --model "$MODEL_PATH" \
  --file "$audio_file" \
  --output-txt \
  --output-file "$output_prefix"

# Check and process output
if [ -f "$txt_file" ]; then
  # Validate or convert encoding
  if iconv -f UTF-8 -t UTF-8 "$txt_file" > /dev/null 2>&1; then
    iconv -f UTF-8 -t UTF-8 "$txt_file" > "$txt_file.clean" && mv "$txt_file.clean" "$txt_file"
  else
    iconv -f BIG5 -t UTF-8 "$txt_file" > "$txt_file.clean" && mv "$txt_file.clean" "$txt_file"
  fi

  # Copy to clipboard without trailing newline
  printf '%s' "$(cat "$txt_file")" | pbcopy

  # Notify: done
  /opt/homebrew/bin/terminal-notifier \
    -title "Whisper Voice Input" \
    -message "✅ Done! Pasting via cliclick..." \
    -sender "$SENDER_BUNDLE" > /dev/null 2>&1

  # Restore focus and paste
  sleep 0.5
  osascript -e "tell application \"$active_app\" to activate"
  sleep 0.3
  /opt/homebrew/bin/cliclick kd:cmd t:v ku:cmd
else
  /opt/homebrew/bin/terminal-notifier \
    -title "Whisper Voice Input" \
    -message "⚠️ No output file found." \
    -sender "$SENDER_BUNDLE" > /dev/null 2>&1
  exit 1
fi 