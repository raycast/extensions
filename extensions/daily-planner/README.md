# Daily Planner

Daily Planner is a [Raycast](https://www.raycast.com) extension designed to help you take control of your time and optimize your productivity. Time block your day, track time spent on tasks, and analyze your time usage—all from the convenience of your macOS launcher. Stay focused and on track with a running timer and task title displayed in the menu bar.

## 🎥 Overview Video

https://user-images.githubusercontent.com/105991837/236577248-a79f12b0-aa0a-4695-af9c-137775c84720.mp4

## 🌟 Features

- **Block Time for To-Dos**: Schedule focus time blocks for tasks from your favorite to-do list apps like Reminders, Things, or Todoist.
- **Track Time for To-Dos**: Track time spent on tasks using Toggl or Clockify, or directly on your calendar. Compare actual time spent with the time blocks you've budgeted for each task.
- **Generate Productivity Reports**: Build customizable reports on blocked and tracked time to uncover productivity patterns and optimize your workflow. Discover how much time you're spending on meetings and other events.
- **Show Menu Bar Timer**: Stay focused with a running timer and associated task title displayed in the macOS Menu.
- **Split Screen To-Dos and Calendar**: Arrange your primary to-do app (Reminders, Things, or Todoist) and macOS Calendar app side by side for a convenient view of your daily tasks and scheduled events. Relaunch the command to restore the to-do app and Calendar window positions and sizes to their original state.

## 🚀 Advantages

- **Seamless To-Do List App Integration**: Continue using your favorite to-do list apps like **Reminders**, **Things**, and **Todoist**—no need to migrate data or learn new systems.
- **Local Calendar Integration**: Your calendar is access locally and securely using macOS frameworks, keeping your data safe without sending it to the cloud.
- **Flexible Time Tracking Options**: Choose from a range of time tracking options, such as using your calendar for a fully-offline, privacy-first experience, or integrating with a popular app like Toggl or Clockify. Or, simply skip time tracking if it's not your thing.
- **Effortless Free Time Finder**: Daily Planner quickly locates available times in your schedule based on natural language input, helping you to rapidly schedule and reschedule time blocks without sifting through calendar events.
- **Natural Language Date Interval Input**: Schedule your time blocks using concise natural language phrases such as “1h”, “2-3p”, or “90 minutes early next week”. Use natural language for report generation as well, like “last 5 weeks” or “late afternoon”.
- **Offline-first and Privacy-focused**: Opt for apps that don't rely on network APIs—Reminders, Things, and Calendar—for complete offline functionality and data processing on your device.
- **Efficient Keyboard Navigation**: Time block your day with just a few keystrokes, eliminating the need to manually copy and paste data.

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
