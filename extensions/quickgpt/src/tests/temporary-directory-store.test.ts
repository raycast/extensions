import {
  addTemporaryDirectory,
  getActiveTemporaryDirectories,
  removeAllTemporaryDirectories,
  removeTemporaryDirectory,
  removeTemporaryDirectoryIfUnchanged,
  restoreTemporaryDirectories,
  updateTemporaryDirectoryUsage,
} from "../stores/temporary-directory-store";

describe("temporary directory transactional rollback", () => {
  let logSpy: jest.SpiedFunction<typeof console.log>;

  beforeEach(() => {
    logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    removeAllTemporaryDirectories();
  });

  afterEach(() => {
    removeAllTemporaryDirectories();
    logSpy.mockRestore();
  });

  it("restores a removed directory without overwriting a concurrent addition", () => {
    const removed = addTemporaryDirectory("/tmp/quickgpt-removed");
    expect(removed).toBeDefined();
    removeTemporaryDirectory(removed!.path);

    const concurrent = addTemporaryDirectory("/tmp/quickgpt-concurrent");
    restoreTemporaryDirectories([removed!]);

    expect(getActiveTemporaryDirectories()).toEqual([concurrent, removed]);
  });

  it("does not undo an addition after another command updates it", () => {
    let now = Date.now();
    const nowSpy = jest.spyOn(Date, "now").mockImplementation(() => ++now);

    try {
      const added = addTemporaryDirectory("/tmp/quickgpt-updated");
      expect(added).toBeDefined();
      updateTemporaryDirectoryUsage(added!.path);

      removeTemporaryDirectoryIfUnchanged(added!);

      expect(getActiveTemporaryDirectories().map((directory) => directory.path)).toContain(added!.path);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("undoes an unchanged addition", () => {
    const added = addTemporaryDirectory("/tmp/quickgpt-added");
    expect(added).toBeDefined();

    removeTemporaryDirectoryIfUnchanged(added!);

    expect(getActiveTemporaryDirectories()).toEqual([]);
  });
});
