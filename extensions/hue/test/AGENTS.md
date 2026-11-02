# Tests

- `test/` sits outside `src/`, which is all `ray lint` and `ray build` look at, so `test/tsconfig.json` type-checks it.
- No test reaches the network. `vitest.config.mts` aliases `@raycast/api`, also inside `@raycast/utils`, to
  `test/raycast-stub.ts`, and `test/setup.ts` mocks `bonjour-service`, makes `timers/promises` sleeps instant (and
  records them), sets `CONNECTION_TIMEOUT_MS` to 300 and stubs `fetch` to throw unless a test stubs it.
- `test/fakeBridge.ts` is an HTTP/2 TLS bridge on 127.0.0.1 with routes tests replace. `test/globalSetup.ts`
  generates its certificates with openssl on every run (the bridge, an impostor CN, a foreign root), so none are
  committed or expire. Addresses no test contacts come from 192.0.2.0/24.
- `test/fixtures/resources.ts` is a real bridge's resources, anonymised: fake UUIDs, English names, fake scene keys
  and recall times. Typed literals, so `tsc -p test` checks `types.ts` against real responses.
