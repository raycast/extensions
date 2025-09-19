Preparing this extension for Raycast Store

Checklist:

1. Update `package.json`:
   - Set `version` to a proper semver (e.g. 0.1.0)
   - Ensure `author`, `owner` are correct
   - Add `repository`, `homepage`, `bugs`, and `keywords` fields

2. Add LICENSE (MIT or your preferred license).

3. Verify `README.md` contains setup and troubleshooting instructions.

4. Run:

```bash
npm run lint
npm run build
```

5. Test the extension in Raycast developer mode:

```bash
npm run dev
```

6. Publish using Raycast CLI (after login and setup):

```bash
npm run publish
```

Notes:
- The extension invokes LibreOffice (`soffice`) which must be installed on users' machines.
- Ensure the `commands` and `preferences` in `package.json` are correct and documented.
