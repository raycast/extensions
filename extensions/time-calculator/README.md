### 🕒 **Time Calculator – Raycast extension**

This extension allows you to **quickly calculate time expressions** like `"1h + 30m"` and get **human-readable results.

---

## **⚡ Features**

- Convert expressions like `1h + 30m - 5s / 2`
- Supports **days, hours, minutes, seconds, milliseconds**
- Supports `at <date>` → returns relative duration (`in 3 days`, `2 months ago`)
- Supports `in <duration>`, `<duration> ago` → returns absolute date
- Supports **weekdays**: `in 5 weekdays`, `3 weekdays ago`
- Handles ultra ancient / future dates: `~25475 BC`, `~12000 AD`
- Multiplication and division: `2d * 3`, `1h / 2`
- Formatted output: `"1 hour, 30 minutes"`

---

## **🛠 Supported Time Units**

- `d` – days
- `w` – weeks
- `h` – hours
- `m` – minutes
- `s` – seconds
- `ms` – milliseconds

You can **combine expressions** (`1h + 30m - 5s / 2`) and use **multiplication/division** (`2d * 3`, `1h / 2`).

---

## **⚡ Example Queries & Outputs**

| Input       | Output                     |
|-------------|----------------------------|
| `1h + 30m`  | `"1 hour, 30 minutes"`     |
| `20d * 2`   | `"40 days"`                |
| `5m / 2`    | `"2 minutes, 30 seconds"`  |
| `1h - 5s`   | `"59 minutes, 55 seconds"` |
| `300ms * 4` | `"1.2 seconds"`            |

---

## 🧪 Date-Based Queries (`at`, `in`, `ago`)

This tool also understands natural language date expressions and returns **relative durations** or **absolute dates**.

### 🧭 `at <date>` → returns relative duration

| Input                  | Output example                                                  |
|------------------------|-----------------------------------------------------------------|
| `at august 1998`       | `26 years 7 months 20 days 11 hours 10 minutes 9 seconds ago`   |
| `at jan 2000`          | `25 years 2 months 20 days 11 hours 10 minutes 47 seconds ago`  |
| `at monday`            | `in 2 days 12 hours 49 minutes 40 seconds`                      |
| `at next friday 21:00` | `in 6 days 12 hours 48 minutes 41 seconds`                      |
| `at last sunday`       | `5 days 11 hours 11 minutes 34 seconds ago` (defaults to 12:00) |

> ⚠️ Note:
> - Avoid using only a year (like `at 2020`) — use a full date or add a month (e.g. `at jan 2020`)
> - Dates like `"at last sunday"` assume noon (12:00) by default if no time is specified.

### 🕓 `in <duration>` / `<duration> ago` → returns absolute date

| Input             | Output example                  |
|-------------------|---------------------------------|
| `in 3 days`       | `Monday, March 24, 2025, 17:00` |
| `5 hours ago`     | `Friday, March 21, 2025, 12:00` |
| `in 10 minutes`   | `Friday, March 21, 2025, 17:10` |
| `5 weekdays ago`  | `Friday, March 14, 2025`        |
| `30000 years ago` | `~27975 BC (too ancient)`       |

> ⚠️ **Note on weekdays**:
> - `weekday(s)` means **working days from Monday to Friday**
> - **Public holidays are not taken into account**, as they vary by country

### 🔁 `from ... to/until/till ...`, `between ... and ...` → returns duration Between Two Dates

You can calculate the **duration between two dates or times** using natural expressions:

### 🧠 Syntax:

```
from <date or time> to <date or time>
between <date or time> and <date or time>
from <date or time> until <date or time>
from <date or time> till <date or time>
```

> Example: `from monday to friday`, `from 10:00 until 18:30`, `from yesterday to next sunday`

### 🧪 Examples:

| Input                                 | Output Example        |
|---------------------------------------|-----------------------|
| `between last sunday and next sunday` | `14 days`             |
| `from 10:00 to 12:30`                 | `2 hours, 30 minutes` |
| `from monday to friday`               | `4 days`              |
| `from yesterday until today`          | `1 day`               |

> ⚠️ **Notes**:
> - If either date is missing or can't be parsed, no result will be returned
> - You can compare **past, present, or future** dates and times

---

## **👨‍💻 Author**

- **Created by** [Shura Vlasov](https://github.com/shura-v)
- **GitHub:** [github.com/shura-v](https://github.com/shura-v)
