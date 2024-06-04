# Apple Reminders

Manage Apple Reminders from within Raycast:
- View, complete and update your reminders
- Effortlessly create new reminders
- Manage your reminders from the menu bar

## Saved Locations

Streamline location-based reminders by saving frequently used addresses. You can do so when creating a reminder through the "Add Saved Location" action. Then you can manage them anytime with the "Manage Locations" command. Adding, editing, and removing locations is just a few clicks away.

## Quickly Add Reminders

Adding reminders is a breeze with natural language input and AI-powered parsing. Simply describe your reminder, and the AI will fill in the details for you, such as the reminder's text, date and time, recurrence, list, priority, or location.

For example, you can type: _"Send the weekly project status report Friday at 2 PM in the Work list."_

The AI will set:
- The text: Send the weekly project status report
- The date: Friday at 2:00 PM
- The list: Work

You can also create location-based reminders by mentioning a saved location. Assuming you have saved a location named "Office", you can type: _"Remind me to buy milk when I'm leaving the office."_

The AI will set:
- The text: Buy milk
- The location: Office
- The proximity: Leaving

You can disable this behavior by toggling on the "Don't use the AI" preference for the "Quick Add Reminder" command. The intelligent date and time parsing will still work, but not the other fields.

## Troubleshooting

> I can't see any reminders and get a `Failed to fetch latest data` error.

Make sure Raycast has access to your reminders in `System Settings → Privacy & Security`.



