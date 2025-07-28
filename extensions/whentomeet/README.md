# WhenToMeet for Raycast

Create [WhenToMeet](https://whentomeet.io) scheduling events using natural language. This Raycast extension allows you to describe your event in plain English and instantly generates a pre-filled WhenToMeet URL with time slots, titles, and descriptions.

**Why Use This Extension:**
Instead of manually creating WhenToMeet events through the web interface, this Raycast extension streamlines the process by using AI to parse your natural language description and automatically generate a pre-filled WhenToMeet event URL. This saves time and reduces the friction of setting up scheduling polls.

## Features

- 🗣️ **Natural Language Processing (Using Raycast AI)**: Describe your event in plain English
- ⏰ **Time Slot Generation**: Automatically creates time slots and other metadata based on your description
- 🔗 **Instant URL Generation**: Opens WhenToMeet with pre-filled event details

## Usage

1. Open Raycast and search for "Create WhenToMeet Event"
2. Describe your event in natural language, for example:
   - "Team meeting tomorrow at 2pm and 3pm for 1 hour"
   - "Football in the park next Friday 6pm to 8pm"
   - "Project kickoff Monday 9am, 10am, and 2pm for 90 minutes"
3. Review the parsed information (title, description, time slots, duration)
4. Edit any fields as needed
5. Click "Create WhenToMeet Event" to open the pre-filled URL

## Examples

### Simple Meeting

**Input**: `"Weekly standup tomorrow 9am for 30 minutes"`

**Generated**:

- Title: "Weekly Standup"
- Description: "Weekly standup meeting"
- Time Slots: Tomorrow 9:00 AM - 9:30 AM
- Duration: 30 minutes

### Multiple Time Options

**Input**: `"Client presentation next Tuesday 2pm, 3pm, or 4pm for 2 hours"`

**Generated**:

- Title: "Client Presentation"
- Time Slots:
  - Tuesday 2:00 PM - 4:00 PM
  - Tuesday 3:00 PM - 5:00 PM
  - Tuesday 4:00 PM - 6:00 PM
- Duration: 120 minutes

## Supported Date Formats

- **Relative dates**: tomorrow, next Monday, next week
- **Specific dates**: January 15, Jan 15, 2025-01-15
- **Times**: 2pm, 14:00, 2:30 PM, 14:30
- **Durations**: 30 minutes, 1 hour, 90 minutes, 2 hours

## How It Works

This extension leverages WhenToMeet's [event creation URLs](https://whentomeet.io/docs/event-creation-urls) to create events programmatically. When you describe your event in natural language, the extension:

1. Uses AI to parse your description and extract event details
2. Converts relative dates and times to specific timestamps
3. Generates multiple time slot options based on your input
4. Creates a properly formatted WhenToMeet URL with all parameters
5. Opens the pre-filled event creation page in your browser
