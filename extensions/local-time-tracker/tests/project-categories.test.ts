import assert from "node:assert/strict";
import test from "node:test";
import { getLegacyProjectCategories } from "../src/lib/project-categories";
import type { Project } from "../src/lib/types";

const legacyProject = (type: string): Project => ({
  id: `project-${type}`,
  name: `${type} project`,
  type,
  isActive: true,
  isPreferred: false,
  createdAt: "2026-09-23T00:00:00.000Z",
  updatedAt: "2026-09-23T00:00:00.000Z",
});

test("does not add default categories when there are no legacy projects", () => {
  assert.deepEqual(getLegacyProjectCategories([]), []);
  assert.deepEqual(getLegacyProjectCategories([legacyProject("consulting")]), []);
});

test("restores legacy categories when existing projects use them", () => {
  const categories = getLegacyProjectCategories([legacyProject("client")]);

  assert.deepEqual(
    categories.map(({ id, name }) => ({ id, name })),
    [
      { id: "client", name: "Client" },
      { id: "internal", name: "Internal" },
    ],
  );
});
