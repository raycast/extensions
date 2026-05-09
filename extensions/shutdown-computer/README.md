# Shutdown Timer

Schedule a Windows shutdown from Raycast by entering an amount of time and choosing seconds, minutes, or hours.

## Commands

- `Schedule Shutdown`: schedules a shutdown after the selected delay. Any existing scheduled shutdown is canceled before the new one is created.
- `Shutdown Timer`: shows the active countdown in Raycast's menu bar and includes a `Cancel Shutdown` action.

## Notes

This extension calls the built-in Windows `shutdown` command. Scheduling a shutdown will affect the current computer.

To cancel a pending shutdown outside Raycast, run:

```powershell
shutdown /a
```
