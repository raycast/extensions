# AGENTS.md

This file provides guidance to agents when working with code in this repository.

- **Validation Logic**: Most bugs arise from strict day limits (30/29) or the year 2000 cap enforced in `src/utils.ts`.
- **Calendar Errors**: Verify `src/hijri-calendar.tsx` for hardcoded month lengths if conversion results are unexpected.
- **UX Flow**: Debugging conversion commands should confirm the sequence: Copy -> HUD -> `popToRoot()`.
- **Form State**: Check `useEffect` dependencies if live previews in `Form.Description` are not updating correctly.
