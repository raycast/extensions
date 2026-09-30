# Deep Links

Deep links let you open specific parts of Orbit directly — from a browser, a script, another app, or anywhere you can click or run a URL. They all follow the same pattern: `orbit://<action>`

## Available Deep Links

### Open Settings

`orbit://settings`

Opens the Settings window. If Settings is already open, it will be brought to the front.

---

### Open Home

`orbit://home`

Opens the Home view.

---

### Pre-fill the search bar

You can optionally pass a search term to have it automatically entered in the search field when the window opens:

`orbit://home?search=Michael`

| Parameter | Required | Description                                      |
| --------- | -------- | ------------------------------------------------ |
| `search`  | No       | A search term to pre-fill in the Home search bar |

**Examples**

`orbit://home?search=design+review`
`orbit://home?search=Q1 planning`

---

### Open Timeline

`orbit://timeline`

Opens the Timeline view at today's date.

---

### Jump to a specific date or timestamp

You can optionally pass either an ISO date or an ISO UTC timestamp to open the timeline directly at that point in time:

`orbit://timeline?date=2026-02-19`

| Parameter | Required | Format                                | Description                           |
| --------- | -------- | ------------------------------------- | ------------------------------------- |
| `date`    | No       | `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss` | The date/time to open the timeline at |

**Examples**

`orbit://timeline?date=2026-01-01`
`orbit://timeline?date=2025-12-31T12:00:00Z`
`orbit://timeline?date=2025-12-31T13:00:00`

> **Note:** If no `date` is provided, Timeline opens at the default current moment.
