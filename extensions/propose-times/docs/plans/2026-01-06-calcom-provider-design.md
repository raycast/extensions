# Cal.com Provider Support

**Date:** 2026-01-06
**Status:** Implementing

## Goal

Add Cal.com as an alternative calendar provider to the Propose Times extension. Users pick one provider in settings (SavvyCal default, Cal.com optional).

## Architecture

- `provider` preference dropdown: savvycal (default) | calcom
- Provider-specific credentials shown conditionally
- Shared interface for fetching slots and generating booking URLs
- No separate booker app for Cal.com—links go directly to cal.com

## File Structure

```text
src/
  propose-times.tsx
  providers/
    index.ts        # Provider factory
    savvycal.ts     # Extracted existing logic
    calcom.ts       # New Cal.com implementation
  types.ts          # Shared TimeSlot interface
```

## Cal.com API

- Slots: `GET https://api.cal.com/v2/slots?eventTypeSlug={slug}&username={user}&start={ISO}&end={ISO}`
- Booking URL: `https://cal.com/{username}/{eventSlug}?date={YYYY-MM-DD}&slot={ISO_TIME}`

## Trade-offs

- Cal.com users land on cal.com's picker (no one-click booking like SavvyCal)
- Only individual event types for v1 (no team events)
- Single provider per user (no merging multiple calendars)

## Test Link

https://cal.com/skinnyandbald/pow-wow
