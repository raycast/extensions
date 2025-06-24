# Jira Helper for Raycast

Create Jira tickets effortlessly using AI-powered descriptions and smart project detection.

## Features

- 🎯 **Smart Ticket Creation**: Uses GPT-4o-mini to convert natural language into structured Jira tickets
- 🏢 **Multi-Project Support**: Auto-detects project from text (e.g., "under project MESH")
- 📋 **Initiative Selection**: Dropdown to choose from current MBNXT initiatives
- 👥 **Team Assignment**: Configurable team selection from all MBNXT teams
- 🔗 **Direct Links**: Click ticket numbers in success notifications to open in browser
- ⚡ **Fast & Efficient**: One-click ticket creation with sensible defaults

## Setup

1. Install the extension in Raycast
2. Configure your settings:
   - **OpenAI API Key**: Your GPT-4o-mini API key
   - **Jira Email**: Your Groupon Jira email
   - **Jira API Token**: Generate from Jira settings
   - **Jira Base URL**: `https://groupondev.atlassian.net`
   - **Default Team**: Select your MBNXT team
   - **Default Initiative**: Choose your current initiative

## Usage

1. Open Raycast and type "Create Jira Ticket"
2. Select an initiative from the dropdown (optional)
3. Describe your ticket in natural language:
   - "Make macaroon cookie HttpOnly" → Creates MBNXT story
   - "Under project MESH, fix login bug" → Creates MESH bug ticket
   - "Epic: Implement new search feature" → Creates epic
4. Hit Enter to create the ticket

## Supported Projects

- **MBNXT** (default): Full feature support with components, teams, and initiatives
- **Any other project**: Basic ticket creation when mentioned explicitly

## Requirements

- Raycast
- Groupon Jira access
- OpenAI API key