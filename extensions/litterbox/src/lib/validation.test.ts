import { beforeEach, describe, expect, it, vi } from "vitest";
const { stat, access } = vi.hoisted(() => ({ stat: vi.fn(), access: vi.fn() }));
vi.mock("fs/promises", () => ({ stat, access }));
import { MAX_FILE_SIZE_BYTES, validateFileSize, validateUploadFile, validateUploadFiles } from "./validation";

describe("upload preflight", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    stat.mockResolvedValue({ isFile: () => true, size: 5 });
    access.mockResolvedValue(undefined);
  });

  it("accepts the exact conservative size boundary, rejects one byte over", async () => {
    stat.mockResolvedValue({ isFile: () => true, size: MAX_FILE_SIZE_BYTES });
    await expect(validateUploadFile("/synthetic/large.bin")).resolves.toBeUndefined();
    stat.mockResolvedValue({ isFile: () => true, size: MAX_FILE_SIZE_BYTES + 1 });
    await expect(validateUploadFile("/synthetic/large.bin")).rejects.toThrow("exceeds the 1 GB limit");
    expect(() => validateFileSize(MAX_FILE_SIZE_BYTES + 1, "grown.bin")).toThrow("exceeds");
  });

  it.each(["app.EXE", "screen.scr", "panel.cpl", "report.doc", "report.DOCX", "report.docm", "app.jar"])(
    "rejects prohibited type %s before filesystem access",
    async (name) => {
      await expect(validateUploadFile(`/synthetic/${name}`)).rejects.toThrow("file type is not allowed");
      expect(stat).not.toHaveBeenCalled();
    },
  );

  it.each(["report.pdf", "document.txt", "app.exe.zip", "README"])("accepts allowed filename %s", async (name) => {
    await expect(validateUploadFile(`/synthetic/${name}`)).resolves.toBeUndefined();
  });

  it("rejects directories and other non-regular files", async () => {
    stat.mockResolvedValue({ isFile: () => false, size: 0 });
    await expect(validateUploadFile("/synthetic/folder")).rejects.toThrow("not a regular file");
  });

  it.each(["ENOENT", "EACCES"])("explains filesystem error %s", async (code) => {
    stat.mockRejectedValue(Object.assign(new Error(code), { code }));
    await expect(validateUploadFile("/synthetic/missing.txt")).rejects.toThrow("cannot be read");
  });

  it("rejects files without read access", async () => {
    access.mockRejectedValue(Object.assign(new Error("EACCES"), { code: "EACCES" }));
    await expect(validateUploadFile("/synthetic/private.txt")).rejects.toThrow("cannot be read");
  });

  it("checks later files and rejects an empty selection", async () => {
    await expect(validateUploadFiles([])).rejects.toThrow("Select at least one file");
    stat.mockResolvedValueOnce({ isFile: () => true, size: 5 }).mockResolvedValueOnce({ isFile: () => false });
    await expect(validateUploadFiles(["/synthetic/one.txt", "/synthetic/folder"])).rejects.toThrow("folder");
    expect(stat).toHaveBeenCalledTimes(2);
  });
});
