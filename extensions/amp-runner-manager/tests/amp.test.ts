import assert from "node:assert/strict";
import { homedir } from "node:os";
import test from "node:test";
import {
  displayPath,
  expandHome,
  getServedDirectories,
  parseRunnerList,
} from "../src/amp";

test("parses multiple runners and preserves directory capabilities", () => {
  const runners = parseRunnerList(
    JSON.stringify({
      runners: [
        {
          runnerId: "macbook",
          workingDirectory: "/Users/test",
          serveCwd: false,
          directories: [
            {
              path: "/Users/test/code/app",
              repositoryURL: "https://example.com/app.git",
              canCreateWorktree: true,
            },
            {
              path: "/tmp/scratch",
              repositoryURL: null,
              canCreateWorktree: false,
            },
          ],
        },
        {
          runnerId: "studio",
          workingDirectory: "/Volumes/code",
          serveCwd: true,
          directories: [],
        },
      ],
    }),
  );

  assert.equal(runners.length, 2);
  assert.deepEqual(runners[0].directories[0], {
    path: "/Users/test/code/app",
    repositoryURL: "https://example.com/app.git",
    canCreateWorktree: true,
  });
  assert.equal(runners[1].runnerId, "studio");
  assert.equal(runners[1].serveCwd, true);
  assert.deepEqual(runners[1].directories, []);
});

test("includes the working directory when the runner serves its cwd", () => {
  const [runner] = parseRunnerList(
    JSON.stringify({
      runners: [
        {
          runnerId: "studio",
          workingDirectory: "/Volumes/code",
          serveCwd: true,
          directories: [],
        },
      ],
    }),
  );

  assert.deepEqual(getServedDirectories(runner), [
    {
      path: "/Volumes/code",
      repositoryURL: null,
      canCreateWorktree: false,
      removable: false,
    },
  ]);
});

test("does not duplicate or allow removing a served cwd listed explicitly", () => {
  const runner = {
    runnerId: "studio",
    workingDirectory: "/Volumes/code",
    serveCwd: true,
    directories: [
      {
        path: "/Volumes/code",
        repositoryURL: "https://example.com/code.git",
        canCreateWorktree: true,
      },
    ],
  };

  assert.deepEqual(getServedDirectories(runner), [
    {
      ...runner.directories[0],
      removable: false,
    },
  ]);
});

test("rejects malformed CLI output instead of showing incorrect state", () => {
  assert.throws(() => parseRunnerList("not json"), /invalid JSON/);
  assert.throws(() => parseRunnerList("{}"), /unexpected runner list/);
  assert.throws(
    () =>
      parseRunnerList(
        JSON.stringify({ runners: [{ runnerId: "incomplete" }] }),
      ),
    /invalid runner/,
  );
});

test("expands and shortens home paths only at the path boundary", () => {
  assert.equal(expandHome("~/code"), `${homedir()}/code`);
  assert.equal(displayPath(`${homedir()}/code/app`), "~/code/app");
  assert.equal(
    displayPath(`${homedir()}-backup/code`),
    `${homedir()}-backup/code`,
  );
});
