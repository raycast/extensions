# AzTU LMS Raycast Extension

Access your Azerbaijan Technical University (AzTU) Learning Management System (LMS) data directly from Raycast. Check schedules, read announcements, and review academic records without opening a browser.

## Commands

The extension bundles several commands to surface different areas of the LMS:

### Login in Browser (Background)

- Launches the AzTU single-sign-on (SSO) flow and opens the LMS dashboard when a fresh login link is required.
- Stores the generated login link locally for reuse within the next hour to reduce repeated authentications.

### Delete Session (Background)

- Clears the cached login link, JWT token.
- Use this command when you want to fully sign out or request a brand-new SSO link.

### Lectures

- Browse your lectures with integrated materials and resources.
- Download course materials and lecture notes directly from Raycast.

### Class Schedule

- Displays the weekly timetable with filters for the current, upper, or lower week rotations.

### Announcements

- Lists the most recent LMS announcements with quick navigation to detailed content within Raycast.

### Profile Information

- Shows personal and academic profile data including contact information, enrollment details, and helpful shortcuts.

### Academic Transcript

- Summarizes semester-by-semester performance, earned credits, and averages.

### Attendance

- Surfaces attendance metrics for each course with status badges and visual indicators for eligibility.
- Lets you open a detailed view per lecture to review attendance history.

## Privacy & Data Handling

- Authentication details remain on your machine.
- Generated login links and JWT tokens are cached locally to reduce the frequency of login prompts.
- Run the **Delete Session** command at any time to clear cached authentication artifacts.

## Disclaimer

- This project is an independent, community contribution and is **not an official AzTU LMS product**.
- The extension is provided "as is" without any warranty. Use it at your own discretion and risk.
- AzTU University or its IT team are not affiliated with or responsible for this project.

## Contributing

Contributions, suggestions, and bug reports are welcome! Feel free to open an issue or submit a pull request to improve the extension's reliability and feature set.

## License

This project is released under the MIT License.
