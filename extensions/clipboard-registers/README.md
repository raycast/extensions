# Clipboard Registers

A Raycast extension that provides 4 **clipboard registers** to save and manage multiple clipboard contents simultaneously. Perfect for developers, writers, and power users who need to juggle multiple pieces of content throughout their workflow.

## What it does

- **Multiple Clipboard Slots**: Store different content in separate registers
- **Smart Switching**: When you switch registers, your current clipboard is automatically saved to the previous register
- **Persistent Storage**: All clipboard contents are saved between Raycast sessions
- **Visual Management**: See all registers with previews, timestamps, and content types

## Commands

### 🔍 Register Overview
View and manage all 4 clipboard registers in a detailed list. See content previews, timestamps, and quickly switch between or clear any register.

### 📋 Register #1-4
Instantly switch to any of the 4 clipboard registers. Each command:
- Saves your current clipboard to the previously active register
- Loads the target register's content to your clipboard
- Shows a confirmation toast with content details

## How it works

1. **First time**: Your current clipboard becomes Register #1
2. **Switching**: Use commands or overview to switch between registers
3. **Auto-save**: Current clipboard is always saved when switching
4. **Empty registers**: Switching to an empty register clears your clipboard
