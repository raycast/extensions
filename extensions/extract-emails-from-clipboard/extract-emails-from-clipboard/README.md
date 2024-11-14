# Extract Emails from Clipboard

Extract email addresses from any text in your clipboard. Perfect for quickly grabbing email addresses from forwarded messages, contact lists, or any text content.

## Features

- Automatically extracts email addresses from clipboard text
- Default format: comma-separated (carrot@example.com, broccoli@example.com)
- Alternative format: space-separated using ⌘↩ (carrot@example.com broccoli@example.com)
- Direct paste option to paste extracted emails into any application
- Works with any text format containing valid email addresses

## Usage

1. Copy text containing email addresses
2. Run the extension
3. Emails are automatically extracted and copied to clipboard
4. Optional: Use ⌘↩ to switch to space-separated format
5. Optional: Use "Paste Emails" action to paste directly into any application

## Example

### Input:

```text
---------- Forwarded message ----------
From: Carrot Ohoolihan <carrot@example.com>
Date: November 13, 2024 at 1:21 PM
To: Broccoli Saunders <broccoli@example.com>
Cc: Cheddar Ferguson <cheddar@example.com>, Spinach Ferguson <spinach@example.com>
Subject: Meeting today and next week
```

### Output:

```text
carrot@example.com, broccoli@example.com, cheddar@example.com, spinach@example.com
```
