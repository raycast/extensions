# Baby Buddy Raycast Extension

A Raycast extension for interacting with your [Baby Buddy](https://github.com/babybuddy/babybuddy) instance.

## Features

- View information about your children
- See last feeding, sleep, and diaper change times
- View detailed information about each child
  - See daily totals for feedings, sleep, diapers, and tummy time
  - Browse detailed activity history for each child
  - View comprehensive statistics for each activity type
- Monitor and manage active timers
- Create new timers with custom start times
- Convert timers into Baby Buddy events (feeding, pumping, sleep, tummy time)
- Edit timer details including name and start time

## Setup

1. Install the extension
2. Configure your Baby Buddy URL and API key in the extension preferences
   - The URL should be the base URL of your Baby Buddy instance (e.g., `https://baby.example.com`)
   - You can generate an API key in Baby Buddy under Settings > API

## Commands

- **Show Baby Info**: Displays a list of your children with their recent activity information
  - View detailed child information including age and daily activity totals
  - Browse activity history for feedings, sleep, diaper changes, and tummy time
- **Active Timers**: Shows all currently running timers with the ability to:
  - Edit timer details (name and start time)
  - End timers and convert them to Baby Buddy events (feeding, pumping, sleep, tummy time)
  - Delete timers that were started by mistake
  - Reset timers to start them over
  - Create new timers for various activities

## Timer Workflow

1. **Create a timer** for an activity (feeding, pumping, sleep, tummy time)
2. **End the timer** when the activity is complete
3. **Choose the activity type** that the timer was for
4. **Fill in details** specific to that activity (amount, notes, etc.)
5. The timer is automatically deleted and a proper Baby Buddy event is created

## AI Commands

Baby Buddy Raycast Extension includes natural language AI capabilities to make tracking and managing baby activities easier:

- **Log Activities with Natural Language**: Create records quickly using commands like:
  - "Log a wet diaper for Emma at 2:30pm"
  - "Record a 15-minute tummy time for Jacob"
  - "Track 4oz bottle feeding for Sophia from 3:15pm to 3:30pm"
  - "Log Emma slept from 7pm to 6am"

- **Quick Status Queries**: Get information instantly:
  - "When was Emma's last feeding?"
  - "How long did Jacob sleep today?"
  - "Show me Sophia's diaper changes for today"
  - "What was Emma's total sleep time yesterday?"

- **Weekly and Monthly Reports**: Generate summaries using natural language:
  - "Summarize Jacob's feeding patterns this week"
  - "Show me Emma's sleep trends for the month"
  - "Generate a report of Sophia's diaper changes for the past 7 days"

The AI interprets your requests and interacts directly with your Baby Buddy instance, saving you time and making baby tracking more intuitive. If you only have one child, it shouldn't need their name. If you have multiple children but typically only use one, you can edit the extension in the Raycast settings and add a prompt to default to a child by their name (e.g. "If I need to provide a child name but did not, assume I mean Emma")