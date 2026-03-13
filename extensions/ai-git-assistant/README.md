# AI Git Assistant

The primary function of this extension is to generate commit messages and PR descriptions using an AI. The extension is
designed to be used with the Raycast app and Raycast AI.

## Features

### Generate Commit Message

1. Takes the path to the Git repository from the selected directory in the Finder.
2. Calls an Raycast AI with key context details about current repository status and recent changes.
3. Provides a facility to regenerate the commit message.
4. Allows direct pasting of the generated commit message to the active application.

### Generate PR Description

1. Takes the path to the Git repository from the selected directory in the Finder.
2. Calls an Raycast AI with key context details about current repository branch changes.
3. Provides a facility to regenerate the PR description.
4. Allows direct pasting of the generated PR description to the active application.

## Prerequisites

Ensure you have the following:

- Git
- Raycast app
- Raycast AI

## Extension Preferences

This extension supports the following preferences:

- AI Commit Message Prompt: The prompt to be used when calling the AI for commit message generation.
- AI PR Description Prompt: The prompt to be used when calling the AI for PR description generation.
