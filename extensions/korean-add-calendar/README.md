# Korean Add Calendar

Create Apple Calendar events or Apple Reminders from deterministic Korean natural-language input.

## Quick Start

1. Run `Create Korean Schedule Item` in Raycast.
2. Enter a Korean schedule sentence in the form or as the optional command argument.
3. Review the parsing summary and selected creation target.
4. Choose a Calendar or Reminder list.
5. Run the create action.

See the [usage and parsing guide](docs/usage-and-parsing-guide.md) for the complete syntax and behavior.

## Input Examples

```text
내일 오후 3시에 회의
다음주 화요일 오전 10시 반에 강남에서 팀 미팅
내일 오후 4시부터 6시까지 회의
3일 안에 계약서 보내기
매주 화요일 오후 4시 코드리뷰
내일 오후 3시 회의, 모레 오후 5시 통화
내일 오후 3시 회의 장소: B1 대회의실
```

## Supported Behavior

- Relative, weekday, month/day, explicit-year, and next-year date expressions
- Korean AM/PM terms and 24-hour time input
- Explicit time ranges using `부터 ... 까지`
- Deadline expressions such as `까지`, `전에`, `N일 안에`, and `N시간 이내`
- Daily, weekly, and monthly recurring Calendar events
- Up to three items in one compound sentence
- Explicit locations using `장소:`, `장소=`, or `장소는`
- Leading and trailing `...에서` location forms
- Automatic Calendar or Reminder recommendation based on parsed intent
- Persistent target, Calendar, Reminder list, and recurrence preferences
- Optional command argument and, when configured, Raycast fallback text that prefill the review form

## Safety Rules

- Every clause in a batch must parse successfully before any item is created.
- Recurrence settings for every clause are validated before any item is created.
- Calendar events and Reminder items cannot be mixed in one submission.
- A comma is treated as a batch separator only when the following clause begins with a date or time cue.
- If a selected Calendar or Reminder list no longer exists, creation stops instead of falling back to another list.
- If the native helper times out, its outcome is marked unconfirmed and the same retry requires an explicit check first.
- Recurring schedules currently support Apple Calendar only.
- A manual location overrides parsed locations for every item in the current submission.

## Permissions

The extension requests Calendar or Reminders access only when the corresponding target is selected. If access is denied, enable Raycast under:

```text
System Settings > Privacy & Security > Calendars
System Settings > Privacy & Security > Reminders
```

EventKit access uses a native executable bundled at build time. Extension users do not need Xcode or a Swift toolchain.

## Development

```bash
npm ci
npm test
npm run lint
npm run build
```

Building the native bridge requires Xcode 16.3 or later. Runtime users do not need Xcode.
