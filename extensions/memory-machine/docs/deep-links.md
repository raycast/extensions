# Deep Links

Deep links let you open specific parts of Memory Machine directly — from a browser, a script, another app, or anywhere you can click or run a URL. They all follow the same pattern: `memorymachine://<action>`

## Available Deep Links

### Open Settings

`memorymachine://settings`

Opens the Settings window. If Settings is already open, it will be brought to the front.

---

### Open Search

`memorymachine://search`

Opens the Search view.

---

### Pre-fill the search bar

You can optionally pass a search term to have it automatically entered in the search field when the window opens:

`memorymachine://search?term=Michael`

| Parameter | Required | Description                                 |
| --------- | -------- | ------------------------------------------- |
| `term`    | No       | A search term to pre-fill in the search bar |

**Examples**

`memorymachine://search?term=design+review`
`memorymachine://search?term=Q1 planning`

---

### Open History

`memorymachine://history`

Opens the History view at today's date.

---

### Jump to a specific date or timestamp

You can optionally pass either an ISO date or an ISO UTC timestamp to open the history directly at that point in time:

`memorymachine://history?date=2026-02-19`

| Parameter | Required | Format                                | Description                          |
| --------- | -------- | ------------------------------------- | ------------------------------------ |
| `date`    | No       | `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss` | The date/time to open the history at |

**Examples**

`memorymachine://history?date=2026-01-01`
`memorymachine://history?date=2025-12-31T12:00:00Z`
`memorymachine://history?date=2025-12-31T13:00:00`

> **Note:** If no `date` is provided, History opens at the default current moment.
