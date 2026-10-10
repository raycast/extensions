<div align="center">
    <br/>
    <br/>
    <img src="./assets/icon.png" alt="fleeting" width="100"/>
    <h3>fleeting</h3>
    <p>Launch synthetic workplace meetings and block matching calendar time</p>
    <p align="center">
        <a href="https://buymeacoffee.com/0xdhrv"><img alt="Buy Me a Coffee" src="https://shieldcn.dev/badge/buymecoffee-FFDD04.svg?size=default&amp;theme=neutral&amp;logo=buymeacoffee" /></a>
        <a href="https://github.com/0xdhrv"><img alt="GitHub" src="https://shieldcn.dev/badge/github-181717.svg?size=default&amp;theme=neutral&amp;logo=github" /></a>
        <a href="https://x.com/0xdhrv"><img alt="Twitter" src="https://shieldcn.dev/badge/twitter-1DA1F2.svg?size=default&amp;theme=neutral&amp;logo=x" /></a>
    </p>
    <br/>
    <br/>
</div>

Fleeting is an unofficial Raycast companion that launches fictional workplace meetings and blocks matching calendar time so you can quickly start one, copy its link, or put it on your calendar. Not affiliated with [Fleeting](https://iminafleeting.com/). All meetings are fictional.

## Commands

- **Start Meeting** – searchable list of all 14 scenarios. Enter opens it; copy link, block calendar, favorites in the Action Panel.
- **Block Calendar** – form that opens a prefilled Google Calendar / Outlook event or saves an `.ics` to `~/Downloads`. Supports repeat (daily, weekdays, weekly, monthly).
- **Quick Meeting** – no-view; opens your preferred (or a random) meeting. Assign a hotkey.

## Notes and limits

- Local only: no accounts, no network calls besides opening links, no calendar read access, no analytics.
- Google Calendar: requests Busy (`trp=true`); the template URL cannot set Private. Recurrence uses the widely used (undocumented) `recur` parameter.
- Outlook: compose links cannot carry recurrence or privacy; repeating events fall back to `.ics`.
- `.ics`: sets `CLASS:PRIVATE`/`TRANSP:OPAQUE`. Recurring events use floating local time so they hold their wall-clock time across DST.
- Raycast has no time-only picker, so date and start time are one date-time field.
- URL: `https://iminafleeting.com/?m=<id>&v=en-US`. Set your name on the Fleeting website; the site remembers it in your browser.
