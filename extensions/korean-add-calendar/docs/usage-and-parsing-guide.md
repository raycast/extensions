# Korean Add Calendar Usage and Parsing Guide

This guide describes the behavior of the current implementation.

## First Launch

1. Run `Create Korean Schedule Item` in Raycast.
2. Optionally enter the Korean sentence as a command argument; it prefills the review form.
3. Select `Apple Calendar Event` or `Reminder Item`.
4. Grant the matching macOS permission when prompted.
5. If the selected list changes outside Raycast, run `Refresh Lists` before creating another item.

The extension requests access only for the currently selected target. Previously selected targets and lists are restored on the next launch.

## Basic Workflow

1. Enter Korean text in `Schedule Sentence`.
2. Review `Parsing Status`, `Parsing Summary`, and `Recommended Target`.
3. Optionally enter a manual location.
4. Select a Calendar or Reminder list.
5. Run the create action.

A manual location overrides every location parsed from the current submission.

## Date Expressions

- Relative dates: `오늘`, `내일`, `모레`
- Relative months: `이번달 25일`, `이달 20일`, `다음달 3일`, `담달 1일`
- Month and day: `3월 12일`
- Explicit year: `2028년 3월 2일`
- Next year: `내년 1월 2일`
- Weekdays: `이번주 화요일`, `다음주 금요일`, `다다음주 수요일`, `월요일`
- Relative deadlines: `3일 안에`, `5일 이내`, `2일 내`
- Relative-hour deadlines: `3시간 안에`, `3시간 이내`, `2시간 내`
- Day deadlines: `오늘 중`, `내일 중`, `모레 중`
- Week deadlines: `이번주 내`, `다음주 내`, `다다음주 내`
- Month deadlines: `이번달 내`, `이달 내`, `다음달 내`, `담달 내`

A weekday without a week modifier moves to the next week when its parsed time has already passed. A month/day without a year moves to the next year when necessary. Explicit years are never adjusted.

## Time Expressions

- Korean periods: `오전 9시`, `오후 3시 반`, `밤 12시`
- 24-hour time: `14:30`
- No time: creates an all-day item
- Start only: `내일 오후 4시부터 회의`
- Explicit range: `내일 오후 4시부터 6시까지 회의`
- Overnight range: `오늘 23:00부터 01:00까지 서버 점검`

When the start has an explicit Korean AM/PM term and the end does not, the parser chooses the nearest positive end time. For example, `오후 11시부터 1시까지` ends at 1 AM the next day, while `오전 11시부터 1시까지` ends at 1 PM on the same day.

## Deadline Intent

The following suffixes are treated as deadlines and removed from the title:

```text
까지
까지는
전
전에
전까지
이전
이전까지
```

Examples:

```text
내일 오후 6시까지 제출
3일 안에 계약서 보내기
3시간 이내 계약서 회신
이번주 내 정산
```

Deadline input represents a due point, not a block beginning at the current time. Deadline intent automatically recommends a Reminder. Calendar events and Reminders cannot be mixed in one batch.

## Recurring Calendar Events

Supported forms:

```text
매일 오후 4시 회의
매주 화요일 오후 4시 코드리뷰
매월 15일 오후 4시 정산
```

Recurring schedules currently support Apple Calendar only. Choose one of these end conditions:

- Occurrence count from 1 through 50
- Inclusive end date on or after the first occurrence and within one year

An explicit time range preserves its wall-clock start and end times for every occurrence, including daylight-saving transitions. For example, a recurring `4시부터 4시 30분까지` event remains 4:00 PM to 4:30 PM.

## Batch Input

Up to three items can be submitted together.

```text
내일 오후 3시 회의, 모레 오후 5시 통화
내일 오후 3시 회의 그리고 오후 5시 코드리뷰
```

Batch safety rules:

- Every clause must parse successfully before creation starts.
- Recurrence settings for all clauses are validated before creation starts.
- All clauses must resolve to the same intent: Calendar events or Reminder items.
- A comma, semicolon, `그리고`, or `하고` splits only when the following text starts with a date or time cue.
- A trailing clause without a date inherits the complete year, month, and day from the first parsed clause.
- If EventKit creation partially fails or times out, only failed or unconfirmed clauses remain in the input.
- Retrying an unconfirmed timeout requires acknowledging that Calendar or Reminders was checked first.

These rules prevent commas in titles or locations from creating unintended items.

## Location Expressions

Final location priority:

1. The manual `Location (Optional)` field
2. Explicit markers: `장소:`, `장소=`, `장소는`
3. A trailing location: `내일 오후 5시 코드리뷰 회의실에서`
4. A leading location: `회의실에서 내일 오후 3시 회의`
5. A location between date and time: `내일 회의실에서 오후 3시 회의`
6. The existing in-sentence `...에서` fallback

Use an explicit marker for multi-word or punctuated locations:

```text
내일 오후 3시 회의 장소: B1 대회의실
내일 오후 3시 회의 장소: 서울, 강남구
```

The trailing `...에서` fallback intentionally captures only the nearest token because title and location boundaries are otherwise ambiguous.

## Title Rules

The parser removes recognized date, time, deadline, recurrence, and location tokens. The remaining text becomes the title. If no title remains, it uses `Untitled`.

## Calendar and Reminder Storage

Calendar events store `title`, `start`, `end`, `location`, `allDay`, and optional recurrence rules through EventKit.

Reminders store the parsed due date. All-day reminders use date components only; timed reminders include hour and minute. A parsed location is stored in notes as `Location: ...`.

If a previously selected Calendar or Reminder list no longer exists, the selection is cleared and the user must explicitly choose another list. A transient list-loading failure does not erase the saved selection. The extension never silently writes to another target.

If native creation times out, the extension keeps an item-specific unconfirmed-outcome warning across command launches. Retrying the same item requires confirmation after checking Calendar or Reminders for a possible duplicate; creating a different item does not clear that warning.

## Current Limitations

- Recurring Reminders are not yet supported.
- Mixed Calendar and Reminder batches must be submitted separately.
- A single manual location applies to every item in a batch.
- Free-form duration phrases such as `30분간` or `2시간 동안` are not yet supported.
- Actual Calendar conflicts and duplicate events are not checked before creation.
