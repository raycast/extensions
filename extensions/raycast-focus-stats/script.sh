#!/bin/bash

# Default: use log show
use_file=false
file_path=""
output_file=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    -f)
      use_file=true
      file_path="$2"
      shift 2
      ;;
    -o)
      output_file="$2"
      # Check if the directory exists
      output_dir=$(dirname "$output_file")
      if [[ ! -d "$output_dir" ]]; then
        echo "Error: Directory $output_dir does not exist"
        exit 1
      fi
      # Check if we can write to the directory
      if [[ ! -w "$output_dir" ]]; then
        echo "Error: Cannot write to directory $output_dir"
        exit 1
      fi
      shift 2
      ;;
    *)
      echo "Unknown argument: $1"
      exit 1
      ;;
  esac
done

# Get log data
if $use_file; then
  if [[ ! -f "$file_path" ]]; then
    echo "File not found: $file_path"
    exit 1
  fi
  log_output=$(<"$file_path")
else
  log_output=$(log show --predicate 'subsystem == "com.raycast.macos" AND category == "focus"' --info --last 30s)
fi

# Temporary variables for current session being parsed
current_start_timestamp=""
current_start_goal=""
current_summary_timestamp=""
current_summary_duration=""

# Read line-by-line
while IFS= read -r line; do
    # Match start line
    if [[ "$line" == *"Start focus session"* ]]; then
        # If we already have a start, output it before starting a new one
        if [[ -n "$current_start_timestamp" && -n "$current_start_goal" ]]; then
            echo "start,$current_start_timestamp,$current_start_goal"
        fi

        current_start_timestamp=$(echo "$line" | awk '{print $1, $2}')
        current_start_goal=""

    elif [[ "$line" == $'\tGoal:'* && -n "$current_start_timestamp" ]]; then
        current_start_goal=$(echo "$line" | cut -f2- -d':' | xargs)
        # Output the complete start entry
        output_line="start,$current_start_timestamp,$current_start_goal"
        if [[ -n "$output_file" ]]; then
            echo "$output_line" >> "$output_file"
        else
            echo "$output_line"
        fi
        current_start_timestamp=""
        current_start_goal=""

    # Match summary line
    elif [[ "$line" == *"Focus session activity summary"* ]]; then
        current_summary_timestamp=$(echo "$line" | awk '{print $1, $2}')

    elif [[ "$line" == $'\tDuration:'* && -n "$current_summary_timestamp" ]]; then
        current_summary_duration=$(echo "$line" | cut -f2- -d':' | xargs)
        # Output the complete summary entry
        output_line="summary,$current_summary_timestamp,$current_summary_duration"
        if [[ -n "$output_file" ]]; then
            echo "$output_line" >> "$output_file"
        else
            echo "$output_line"
        fi
        current_summary_timestamp=""
    fi
done <<< "$log_output"

# If we have an incomplete start session at the end, output it
if [[ -n "$current_start_timestamp" && -n "$current_start_goal" ]]; then
    output_line="start,$current_start_timestamp,$current_start_goal"
    if [[ -n "$output_file" ]]; then
      echo "$output_line" >> "$output_file"
    else
      echo "$output_line"
    fi
fi
