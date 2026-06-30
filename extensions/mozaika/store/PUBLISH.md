# Publishing — Mozaika Raycast extension

Paste-ready listing + the exact submission steps. The extension is built, typechecked and
lint-clean (`npx ray build` ✓, `npx ray lint` ✓) — the only open items are **your Raycast handle**
and the **store screenshots**, both of which need the Raycast app.

---

## 0. One-time setup (your job — needs the Raycast app)

1. Install **Raycast** (macOS, or **Raycast for Windows** — this extension declares both platforms).
2. Open Raycast → sign in. This creates/confirms your **Store handle**.
3. Set `author` in [`package.json`](../package.json) to that exact handle. It's currently `sezabut`
   as a placeholder — `npx ray lint` will 404 until it matches a real Raycast handle.

---

## 1. Listing copy (paste-ready)

**Name** (title): `Mozaika — Decode Design Systems`

**Description / tagline:**
> Decode any website's real design system — colors, fonts, type scale and buttons — and search a
> curated library of shipped product UIs, right from Raycast.

**Categories:** Design Tools, Developer Tools

**Commands:**
- **Decode a Site** — decode any website's real design system; copy it as an agent prompt or JSON.
- **Search Design References** — search a curated grid of real product screens, open them in Mozaika.

**Keywords:** design system, decode, colors, fonts, typography, ui, inspiration, frontend

---

## 2. Screenshots (your job — needs Raycast)

The Store wants **real** screenshots (2000×1250 PNG, light + optionally dark). Don't fake them.

1. `cd raycast-extension && npx ray develop` — loads the extension into Raycast (dev mode).
2. Run **Decode a Site** (e.g. `linear.app`) — when the decoded Detail is on screen, use Raycast's
   **"Take Screenshot for Store"** action (dev-mode Action Panel, or the window-capture hotkey).
3. Run **Search Design References** (e.g. `pricing`) — capture the grid.
4. Capture the **Copy Agent Prompt** action highlighted (shows the funnel).
5. Raycast saves them to `metadata/` as `mozaika-1.png … mozaika-N.png` (1–6 images).

Suggested order: (1) decoded site Detail, (2) references grid, (3) the agent-prompt action, (4) the
empty/limit state with the Founder CTA.

---

## 3. Submit

```bash
cd raycast-extension
npm run lint        # must be clean (incl. author handle)
npm run build       # ✓ already verified
npm run publish     # opens a PR to raycast/extensions on your behalf
```

`npm run publish` builds, validates, and opens a **pull request to `raycast/extensions`**. The Raycast
team reviews (usually a few days). Respond to any review comments on the PR.

---

## 4. After approval (one-line flips)

- Set `RAYCAST_STORE_URL` → `RAYCAST_STORE_LIVE_URL` in
  [`frontend/src/lib/links.js`](../../frontend/src/lib/links.js) (mirrors the Figma pattern), and
  surface "Get the Raycast extension" on `/connect` + the launch posts.
- Use the launch copy in [`launch/08_raycast.md`](../../launch/08_raycast.md).

---

## Notes

- **No backend changes needed for the core** — the extension calls the public `/api/decode` and
  `/api/inspirations`. The optional **Mozaika Token** preference lifts the daily decode cap via the
  `/api/decode` MCP-token path (shipped alongside this).
- The icon is the shared Mozaika mark (`assets/icon.png`, 512×512) — same as the Chrome extension,
  Figma plugin and favicon, for cross-channel consistency.
