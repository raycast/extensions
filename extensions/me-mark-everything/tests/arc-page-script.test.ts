import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { pageScript } from "../src/page-script";

test("Arc reads the front window and active tab without resolving their object references", () => {
  const activeTab = Object.assign(
    () => {
      throw Error("Can't convert types. (-1700)");
    },
    {
      url: () => "https://example.org/arc?q=a,b",
      title: () => '中文, "quoted"\nsecond line',
    },
  );
  const windows = Object.assign(
    () => {
      throw Error(
        "Eager window resolution reproduces Arc's incompatible reference",
      );
    },
    { 0: { activeTab } },
  );
  Object.defineProperty(windows, "length", { value: 1 });
  const raw = runInNewContext(
    pageScript + '\nrun(["company.thebrowser.Browser"])',
    {
      Application: (id: string) => {
        assert.equal(id, "company.thebrowser.Browser");
        return { running: () => true, windows };
      },
    },
  );
  assert.deepEqual(JSON.parse(raw), {
    url: "https://example.org/arc?q=a,b",
    title: '中文, "quoted"\nsecond line',
  });
});

test("Arc does not read windows when closed and reports an empty window collection", () => {
  const run = (app: object) =>
    JSON.parse(
      runInNewContext(pageScript + '\nrun(["company.thebrowser.Browser"])', {
        Application: () => app,
      }),
    );
  assert.deepEqual(
    run({
      running: () => false,
      get windows() {
        throw Error("must not query closed Arc");
      },
    }),
    { error: "NOT_RUNNING" },
  );
  assert.deepEqual(run({ running: () => true, windows: { length: 0 } }), {
    error: "NO_WINDOW",
  });
});
