import { describe, expect, it } from "vitest";

import { worktreeFilterService } from "./worktree-filter.service";

describe("filterWorktreesByMappings", () => {
  it("mapping に一致する originPath の worktree だけを返す", () => {
    const result = worktreeFilterService.filterByMappings({
      worktrees: [
        {
          path: "/tmp/worktrees/app-a~_~feature-a",
          originPath: "/repos/app-a",
          repo: "app-a",
        },
        {
          path: "/tmp/worktrees/app-z~_~feature-z",
          originPath: "/repos/app-z",
          repo: "app-z",
        },
      ],
      mappings: [{ repoRoot: "/repos/app-a" }],
      homeDir: "/Users/tester",
    });

    expect(result).toEqual([
      {
        path: "/tmp/worktrees/app-a~_~feature-a",
        originPath: "/repos/app-a",
        repo: "app-a",
      },
    ]);
  });

  it("originPath がないときは path を使って判定する", () => {
    const result = worktreeFilterService.filterByMappings({
      worktrees: [
        {
          path: "/Users/tester/dev/app-a",
          repo: "app-a",
        },
        {
          path: "/Users/tester/dev/app-b",
          repo: "app-b",
        },
      ],
      mappings: [{ repoRoot: "~/dev/app-a" }],
      homeDir: "/Users/tester",
    });

    expect(result).toEqual([
      {
        path: "/Users/tester/dev/app-a",
        repo: "app-a",
      },
    ]);
  });

  it("mapping が空のときは空配列を返す", () => {
    const result = worktreeFilterService.filterByMappings({
      worktrees: [
        {
          path: "/Users/tester/dev/app-a",
          repo: "app-a",
        },
      ],
      mappings: [],
      homeDir: "/Users/tester",
    });

    expect(result).toEqual([]);
  });
});
