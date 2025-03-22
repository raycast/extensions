# Moneybird Raycast extension

A Raycast extension that allows you to quickly manage time entries in your Moneybird administration without leaving your keyboard.

 > This is in active development

## Features

- 🕒 Record hours with detailed information
- ⏱️ Start timing with a single command
- 🔄 OAuth integration with Moneybird
- 👥 Support for multiple customers and projects
- 📝 Add descriptions and break times
- ✅ Mark entries as declarable

## Prerequisites

- [Raycast](https://raycast.com/) installed on your machine
- A Moneybird account with API access
- OAuth client credentials (automatically configured)

## Installation

1. Open Raycast
2. Search for "Store"
3. Find "Moneybird" and install the extension
4. Authenticate with your Moneybird account when prompted

## Commands

### Record Hours

Use this command to add a new time entry to your Moneybird administration. You can specify:

- Description of the work
- Start and end date/time
- Break time
- Customer and project
- Declarable status
- Assigned user

### Start Timing

Quickly mark the current time as a start point for your time entry. This command runs in the background and can be used to start tracking time which you can later complete using the "Record Hours" command.

## Development

```bash
# Clone the repository
git clone https://github.com/janyksteenbeek/raycast-moneybird

# Install dependencies
npm install

# Start development
npm run dev
```