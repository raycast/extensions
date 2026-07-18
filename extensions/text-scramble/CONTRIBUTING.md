# Contributing

Small, focused contributions are welcome.

## Setup

```bash
npm ci
npm run dev
```

## Before opening a pull request

```bash
npm test
npm run lint
npm run build
```

Changes to the scrambling model should preserve all structural invariants in the test suite and keep the output quiet, readable, and non-semantic. Please add a focused test for behavior changes. Avoid runtime network services: selected text must stay on the device.
