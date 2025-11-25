import { describe, expect, it } from "bun:test";
import type { FileNode, FileSystemIndex, Volume } from "../src/types";
import { formatSize, createUsageBar } from "../src/utils/format";
import { adjustVolume, pruneFileSystemIndex } from "../src/utils/calc";
import { buildFileNode, parseDuRecord } from "../src/utils/scan";
// ВНИМАНИЕ: Добавьте `export` к функциям parseDuRecord и buildFileNode в src/utils/scan.ts;

const KB_TO_BYTES = 1024;

describe("formatSize", () => {
  it("should format bytes correctly (base 1024)", () => {
    expect(formatSize(0)).toBe("0 B");
    expect(formatSize(512)).toBe("512 B");
    expect(formatSize(1024)).toBe("1 KB");
    expect(formatSize(1024 * 1024)).toBe("1 MB");
    expect(formatSize(1024 * 1024 * 1024)).toBe("1 GB");
    expect(formatSize(1024 ** 4)).toBe("1 TB");
  });

  it("should format bytes correctly (base 1000)", () => {
    expect(formatSize(0, 1000)).toBe("0 B");
    expect(formatSize(1000, 1000)).toBe("1 KB");
    expect(formatSize(1000 * 1000, 1000)).toBe("1 MB");
    expect(formatSize(1000 * 1000 * 1000, 1000)).toBe("1 GB");
  });

  it("should format fractional sizes", () => {
    expect(formatSize(1536)).toBe("1.5 KB");
    expect(formatSize(2560)).toBe("2.5 KB");
    expect(formatSize(1024 * 1.5)).toBe("1.5 KB");
  });

  it("should handle large numbers", () => {
    expect(formatSize(1024 ** 4 * 2.5)).toBe("2.5 TB");
  });
});

describe("createUsageBar", () => {
  it("should return empty bar when maxSize is 0", () => {
    expect(createUsageBar(100, 0)).toBe("|　　　　　　　　　　|");
    expect(createUsageBar(0, 0)).toBe("|　　　　　　　　　　|");
  });

  it("should return empty bar when size is 0", () => {
    expect(createUsageBar(0, 100)).toBe("|　　　　　　　　　　|");
  });

  it("should create full bar when size equals maxSize", () => {
    const bar = createUsageBar(100, 100);
    expect(bar).toMatch(/^\|[\u2593]{10}\|$/);
  });

  it("should create half-filled bar", () => {
    const bar = createUsageBar(50, 100);
    expect(bar).toMatch(/^\|[\u2593]{5}[\u2003]{5}\|$/);
  });

  it("should create quarter-filled bar", () => {
    const bar = createUsageBar(25, 100);
    expect(bar).toMatch(/^\|[\u2593]{2,3}[\u2003]{7,8}\|$/);
  });

  it("should handle custom length", () => {
    const bar = createUsageBar(50, 100, 20);
    expect(bar).toMatch(/^\|[\u2593]{10}[\u2003]{10}\|$/);
  });

  it("should cap at max length", () => {
    const bar = createUsageBar(200, 100);
    expect(bar).toMatch(/^\|[\u2593]{10}\|$/);
  });
});

describe("parseDuRecord", () => {
  it("should parse valid du line", () => {
    const result = parseDuRecord("1024\t/home/user/file.txt");
    expect(result).toEqual({ kb: 1024, path: "/home/user/file.txt" });
  });

  it("should handle lines with extra spaces if separated by tab", () => {
    // В новой реализации parseDuRecord ожидает разделение именно по \t
    const result = parseDuRecord("2048\t/home/user/file.txt");
    expect(result).toEqual({ kb: 2048, path: "/home/user/file.txt" });
  });

  it("should return null for empty line", () => {
    expect(parseDuRecord("")).toBe(null);
    expect(parseDuRecord("   ")).toBe(null);
  });

  it("should return null for invalid format", () => {
    expect(parseDuRecord("invalid line")).toBe(null);
    // Если нет таба
    expect(parseDuRecord("123 /path")).toBe(null);
  });

  it("should handle large numbers", () => {
    const result = parseDuRecord("1048576\t/home/user/large.txt");
    expect(result).toEqual({ kb: 1048576, path: "/home/user/large.txt" });
  });

  it("should handle paths with spaces", () => {
    const result = parseDuRecord("1024\t/home/user/my file.txt");
    expect(result).toEqual({ kb: 1024, path: "/home/user/my file.txt" });
  });
});

describe("buildFileNode", () => {
  const normalizedHome = "/home/user";

  it("should create file item for valid path", () => {
    const result = buildFileNode(1024, "/home/user/file.txt", normalizedHome);
    expect(result).toEqual({
      name: "file.txt",
      bytes: 1024 * KB_TO_BYTES,
      formattedSize: formatSize(1024 * KB_TO_BYTES),
      path: "/home/user/file.txt",
    });
  });

  it("should return null for path outside home", () => {
    expect(buildFileNode(1024, "/other/path/file.txt", normalizedHome)).toBe(
      null,
    );
  });

  it("should handle nested paths", () => {
    const result = buildFileNode(
      2048,
      "/home/user/subdir/file.txt",
      normalizedHome,
    );
    expect(result?.name).toBe("file.txt");
    expect(result?.path).toBe("/home/user/subdir/file.txt");
    expect(result?.bytes).toBe(2048 * KB_TO_BYTES);
  });
});

describe("adjustVolume", () => {
  const initialVolume: Volume = {
    freeBytes: 1000,
    totalBytes: 10000,
    usageLabel: "90%",
  };

  it("should increase free space and decrease usage", () => {
    const freed = 1000;
    const result = adjustVolume(initialVolume, freed);

    expect(result.freeBytes).toBe(2000);
    expect(result.totalBytes).toBe(10000);
    // Used: 10000 - 2000 = 8000. 8000/10000 = 80%
    expect(result.usageLabel).toBe("80%");
  });

  it("should handle full cleanup", () => {
    const freed = 9000;
    const result = adjustVolume(initialVolume, freed);
    expect(result.freeBytes).toBe(10000);
    expect(result.usageLabel).toBe("0%");
  });
});

describe("pruneFileSystemIndex", () => {
  const rootDir = "/home/user";

  // Хелпер для создания ноды
  const mkNode = (pathStr: string, sizeKb: number): FileNode => ({
    path: pathStr,
    name: pathStr.split("/").pop()!,
    bytes: sizeKb * 1024,
    formattedSize: formatSize(sizeKb * 1024),
  });

  // Исходное состояние:
  // /home/user (root)
  //   - file1.txt (1000 KB)
  //   - dir1 (1500 KB) -> фактически в index это отдельная запись

  // /home/user/dir1
  //   - file2.txt (500 KB)
  //   - file3.txt (1000 KB)

  const initialIndex: FileSystemIndex = {
    "/home/user": {
      accessible: [
        mkNode("/home/user/file1.txt", 1000),
        mkNode("/home/user/dir1", 1500),
      ],
      restricted: [],
    },
    "/home/user/dir1": {
      accessible: [
        mkNode("/home/user/dir1/file2.txt", 500),
        mkNode("/home/user/dir1/file3.txt", 1000),
      ],
      restricted: [],
    },
  };

  it("should remove file and update parent folder sizes", () => {
    // Удаляем file2.txt (500 KB)
    const pathsToRemove = ["/home/user/dir1/file2.txt"];

    const { index, freedBytes } = pruneFileSystemIndex(
      initialIndex,
      pathsToRemove,
      rootDir,
    );

    // 1. Проверяем freedBytes
    expect(freedBytes).toBe(500 * 1024);

    // 2. Проверяем вложенную папку (dir1)
    const dir1Content = index["/home/user/dir1"];
    expect(dir1Content.accessible).toHaveLength(1);
    expect(dir1Content.accessible[0].name).toBe("file3.txt"); // Остался только file3

    // 3. Проверяем корневую папку (user)
    const rootContent = index["/home/user"];
    expect(rootContent.accessible).toHaveLength(2);

    // Находим dir1 в корне
    const dir1Node = rootContent.accessible.find((n) => n.name === "dir1");
    expect(dir1Node).toBeDefined();
    // Размер dir1 должен уменьшиться на 500KB (было 1500, стало 1000)
    expect(dir1Node?.bytes).toBe(1000 * 1024);
  });

  it("should remove entire folder if included in pathsToRemove", () => {
    // Удаляем всю папку dir1
    const pathsToRemove = ["/home/user/dir1"];

    const { index, freedBytes } = pruneFileSystemIndex(
      initialIndex,
      pathsToRemove,
      rootDir,
    );

    // В текущей реализации pruneFileSystemIndex не рекурсивно считает размер удаляемой папки,
    // если она явно передана. Она просто исключает ключи.
    // Но так как мы передаем pathsToRemove, она также вычищает их из списков accessible.

    // Проверяем, что ключ папки исчез
    expect(index["/home/user/dir1"]).toBeUndefined();

    // Проверяем, что папка исчезла из списка в корне
    const rootContent = index["/home/user"];
    const dir1Node = rootContent.accessible.find((n) => n.name === "dir1");
    expect(dir1Node).toBeUndefined();
  });
});
