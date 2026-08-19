# Safety

## Physical hazards

An unattended standing desk can crush objects, pull cables, tip equipment, or injure a person. Bluetooth and software failures can delay or prevent a stop command.

## Operator checklist

Before movement:

1. Watch the desk for the complete movement.
2. Clear people, chairs, drawers, shelves, and loose objects.
3. Check power and data cable slack.
4. Keep the physical desk control within reach.
5. Know how to disconnect desk power.

During movement:

1. Stop immediately when clearance changes.
2. Do not leave the desk unattended.
3. Use the physical control if Raycast becomes unavailable.

## Software safeguards

The extension implements these independent safeguards:

- Configurable minimum and maximum target heights.
- A first-use safety acknowledgement.
- A safety acknowledgement scoped to the selected physical desk.
- Explicit desk selection before every status or movement command.
- A single-process movement lock.
- A latest-request-wins handoff that stops an active extension movement.
- A five-second handoff timeout before a new movement fails safely.
- Target writes at a controlled interval.
- Two stable target readings before completion.
- Stall detection.
- A 45-second movement timeout.
- A final stop command after success, cancellation, or failure.
- Stop requests before and after desk or calibration changes.

These safeguards reduce risk. They do not replace operator attention or the desk controller's hardware protections.

## Contributor rules

- Do not automate physical movement in unit tests or continuous integration.
- Do not perform a live movement test without explicit authorization.
- Preserve Stop access while movement is active.
- Treat timeout, bounds, locking, and stall logic as safety-critical code.
- Add focused tests before changing height encoding or completion thresholds.
- Report whether verification was offline, status-only, or physical.

## Recovery

If software movement does not stop:

1. Use the physical desk control.
2. Disconnect desk power if the physical control fails.
3. Clear the obstruction before restoring power.
4. Do not retry software movement until the cause is understood.
