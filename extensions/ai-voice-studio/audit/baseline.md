# Audit Baseline

- Audit time: 2026-05-25T16:35:45Z.
- Repository: `/Users/xianweizhang/Projects/raycast-ai-voice-studio`.
- Initial git status before verification: clean.
- Current git status after audit work: `M src/api/qwen-tts-realtime.ts`, `?? audit/`.
- Node: `v26.0.0`.
- Package version: `1.0.0`.
- Manifest command count observed in `package.json`: 20 commands, not 22.
- `@raycast/api` in project: `^1.104.16`.
- `@raycast/api` latest from `npm view @raycast/api version`: `1.104.18`.

## Verify Baseline

- First sandboxed `npm run verify` attempt failed at `ray lint` because the sandbox could not resolve `www.raycast.com`.
- Re-run with network permission passed.
- Baseline output: `audit/verify-baseline.txt`.
- Baseline result: passed.
- Tail evidence: `ray build`, `ray lint`, `tsc --noEmit`, `npm audit`, and local verification evidence all completed; `npm audit` found 0 vulnerabilities.

## After Quick-Win Patch

- Applied one quick-win source change: Qwen realtime WebSocket `Authorization` scheme from `bearer` to `Bearer`.
- Full `npm run verify` was re-run after the patch.
- Post-patch output: `audit/verify-after-quick-wins.txt`.
- Post-patch result: passed.
