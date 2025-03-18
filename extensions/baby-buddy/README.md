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