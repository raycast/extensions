# PR Description

## Summary
- Adds template placeholder validation with inline warnings to prevent malformed exports when users customize the output layout.
- Blocks saving invalid placeholders inside the in-app template editor and surfaces the offending tokens directly in the UI.
- Improves clipboard auto-fill safety by skipping background reads once the user starts typing.
- Restores Raycast submission compliance by fixing the changelog date placeholder and running lint/build validations.

## Testing
- [x] `npm run test -- markdown-builder`
- [x] `npm run lint`
- [x] `npm run build`
