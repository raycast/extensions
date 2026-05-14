# Apple Reminders

Manage Apple Reminders from within Raycast:

- View, complete and update your reminders
- Effortlessly create new reminders
- Manage your reminders from the menu bar

## Saved Locations

Streamline location-based reminders by saving frequently used addresses. You can do so when creating a reminder through the "Add Saved Location" action. Then you can manage them anytime with the "Manage Locations" command. Adding, editing, and removing locations is just a few clicks away.

## Customize Create Reminder Form

Use the "Customize Create Reminder Form" command to choose which field groups appear in the create reminder form and move them up or down into your preferred order.

You can:

- Turn optional field groups on or off
- Move items up and down with the action panel
- Add separators below any field or separator
- Delete separators you no longer need
- Reset the form back to the default layout

The default order matches the original Create Reminder form:

- Title
- Notes
- Date
- Recurrence
- List
- Priority
- Location

Recurrence remains tied to the date field, so it only appears when Date is enabled and a due date is selected.

You can open the customization UI either from Raycast search with the "Customize Create Reminder Form" command or from the action panel inside "Create Reminder."

## Manage Create Actions

Use the "Manage Create Actions" command to choose which Apple Shortcuts should run after a reminder is created.

You can:

- Search your installed shortcuts and add them as post-create actions
- Enable or disable actions without removing them
- Reorder actions to control the run order
- Limit actions to the "Create Reminder" flow, the "Quick Add Reminder" flow, or both
- Rename the display label used inside Raycast

Shortcuts are run without any input. This makes the feature flexible for reminder-related automations such as tag processing, but you can also use it for unrelated workflows.

You can open the create actions UI either from Raycast search with the "Manage Create Actions" command or from the action panel inside "Create Reminder."

## Create Reminder

Use "Create Reminder" when you want full control over the reminder fields.

You can set:

- Title
- Notes
- Due date
- Recurrence
- List
- Priority
- Location-based reminders

If you prefer a simpler form, customize it and hide the fields you do not use often.

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
