# AI Git Assistant

The primary function of this extension is to generate Git commit messages using Raycast's AI and to feed from the diff and status outputs of your repository.

## Features

1. Identifies the latest changed git repository in the specified directory.
2. Calls an Raycast AI with key context details about current repository status and recent changes.
3. Provides a facility to regenerate the commit message.
4. Allows direct pasting of the generated commit message to the active application.

## Prerequisites

Ensure you have the following:

- Git
- Raycast app
- Raycast AI

## Usage

- You can use the extension by calling it via the Raycast command line.
- Once the AI generates the commit message, you can choose to paste the response in your desired application or regenerate the message.

## Extension Preferences

This extension supports the following preferences:

- Path to Git Repos Directory: The path to the directory where your Git repositories are stored (required).
- AI Prompt: The prompt to be used when calling the AI for commit message generation.
