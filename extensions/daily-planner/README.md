# Daily Planner

Daily Planner is a [Raycast](https://www.raycast.com) extension designed to help you take control of your time and optimize your productivity. Time block your day, track time spent on tasks, and analyze your time usage—all from the convenience of your macOS launcher. Stay focused and on track with a running timer and task title displayed in the menu bar.

## 🎥 Overview Video

https://user-images.githubusercontent.com/105991837/236577248-a79f12b0-aa0a-4695-af9c-137775c84720.mp4

## 🌟 Features

- **Block Time for To-Dos**: Schedule time blocks for tasks pulled from your preferred to-do list apps: Reminders, Things, or Todoist.
- **Track Time for To-Dos**: Log time spent on tasks using Toggl or Clockify, or directly on your calendar. If time tracking isn't your thing, you have the freedom to skip it.
- **Generate Productivity Reports**: Analyze your productivity by comparing budgeted time blocks and actual time spent on tasks. Discover how much of your time is dedicated to meetings and other events.
- **Show Menu Bar Timer**: Stay focused with a running timer and associated task title displayed in your macOS Menu Bar.
- **Split Screen To-Dos and Calendar**: Display your primary to-do app and Calendar side by side for visually assisted time blocking. Relaunch to restore original window positions and sizes.

## 🚀 Advantages

- **Effortless Free Time Finder**: Instantly locate open slots in your schedule. Rapidly schedule and reschedule time blocks without the need to painstakingly sift through your calendar events.
- **Natural Language Date/Time Expressions**: Harness the power of intuitive natural language phrases like “1h”, “2-3p”, or “90 mins early next week” to schedule your time blocks with ease. Extend this convenience to report generation with expressions like “last 5 weeks” or “Monday through Thursday”.
- **Seamless Integration, No Duplicates**: Keep using your favorite apps without interruption. Daily Planner acts as a seamless connector between your existing apps, without creating duplicate data. There's no need to migrate data or learn new systems.
- **Offline-first and Privacy-focused**: Your privacy comes first—your calendar is accessed locally and securely. Choose apps that don't rely on network APIs—like Reminders, Things, and Calendar—for a complete offline experience and secure on-device data processing.
- **Efficient Keyboard Navigation**: Make the mouse optional. Glide through your day with just a few keystrokes.

## 🎯 Getting Started

1. Download [Raycast](https://www.raycast.com) if you haven’t already.
2. Install [Daily Planner Extension](https://www.raycast.com/benyn/daily-planner).
3. When you launch any of the five commands, you’ll be asked to choose your primary to-do list app and the calendar to use for time blocking. Enter an existing calendar name if you already have a calendar you can use for time blocking. If not, you’ll see a prompt that lets you create a calendar with the name you entered.
4. If you wish to use time tracking, you'll need to provide a few more details. When you launch the "Track Time for To-Dos" command for the first time, you'll be prompted to enter these data points in the Raycast Extension Settings. Start by selecting your preferred method (Calendar, Toggl, or Clockify). If you choose Calendar, enter the name of the calendar for time tracking, ideally different from the one used for Time Blocking Calendar. If you opt for Toggl or Clockify, input the corresponding API key.
5. Time block your day, track time, review your productivity, and repeat!

## 🔗 Integrations

### To-Do List Apps

- [Reminders](https://www.icloud.com/reminders)
- [Things](https://culturedcode.com/things/)
- [Todoist](https://todoist.com/)

### Calendars

Any calendars set up on macOS, including but not limited to:

- [iCloud Calendar](https://www.icloud.com/calendar)
- [Google Calendar](https://calendar.google.com/)
- [Outlook Calendar](https://outlook.live.com/)

### Time Tracking Apps

- [Calendar](https://support.apple.com/guide/calendar/welcome/mac) (Time entries are created as calendar events on a dedicated calendar)
- [Toggl Track](https://toggl.com/track/)
- [Clockify](https://clockify.me)

## 💡 Usage

---

[View the **DOCUMENTATION**](https://benyn.github.io/raycast-daily-planner) for usage information.

---

## 🔒 Privacy

When you opt to use Reminders or Things, your data remains local on your device, and the extension is designed not to transmit information to external servers or share it with third parties. Any cloud sync is handled by the Reminders or Things app itself. When you opt to use Todoist, Toggl, or Clockify, your data is fetched from and transmitted back to the respective servers via the official API, solely for the essential functionality of the extension. The extension does not transmit information to external servers or share it with third parties beyond the necessary interactions with the services you've selected to use.

This extension does not track your activities or collect your data, even in an anonymized or aggregated form. As this extension is an open-source project, anyone is invited to review its code, not only to verify the accuracy of the privacy claims but also to suggest improvements. Please note that the extension operates within the Raycast platform, and we cannot control or provide guarantees regarding Raycast's data handling practices. We encourage you to review Raycast's privacy policy to better understand how your data is managed and protected.

## 📚 Shortcuts for iOS/iPadOS

Use these Shortcuts when you are on mobile and can’t use Raycast.

- [Start To-Do Timer](https://www.icloud.com/shortcuts/3dfdc2108a354ad1860a8117e239a633) (supports Reminders/Things only due to Todoist Shortcuts limitations)
- [Stop Running Timer](https://www.icloud.com/shortcuts/986cea63d5814ef284a1a274b8f52fb0)

## 🤝 Contributing

We appreciate and welcome contributions to this project! If you're interested in contributing, please follow Raycast's [Contribute to an Extension guide](https://developers.raycast.com/basics/contribute-to-an-extension). We're particularly keen on contributions related to data analysis in productivity reports. If you have data analysis or data science expertise, your help in examining trends and uncovering meaningful patterns in productivity reports to enhance the extension would be invaluable.

To report a bug, request a new feature, or provide feedback, create an issue in the [raycast/extensions](https://github.com/raycast/extensions/issues) repository. When creating an issue, please remember to add the `extension: daily-planner` label to ensure it is categorized correctly.

## 💫 Inspirations

- [“Deep Work”](https://calnewport.com/writing/#books) by Cal Newport
- [“Four Thousand Weeks”](https://www.oliverburkeman.com/books) by Oliver Burkeman
- [Sunsama](https://www.sunsama.com)
- [Reclaim](https://reclaim.ai)
- [Benjamin Franklin’s daily schedule](https://www.theatlantic.com/politics/archive/2011/04/picture-of-the-day-benjamin-franklins-daily-schedule/237615/)
