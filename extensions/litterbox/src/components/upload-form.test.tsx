import { beforeEach, describe, expect, it, vi } from "vitest";

type Values = { file: string[]; time: string };
const mocks = vi.hoisted(() => ({
  useForm: vi.fn(),
  uploadFilesBatch: vi.fn(),
  showToast: vi.fn(),
  pop: vi.fn(),
  setLoading: vi.fn(),
  setValue: vi.fn(),
  currentFiles: [] as string[],
  toast: { style: "", title: "", message: "" },
}));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useRef: () => ({ current: false }),
  useState: () => [false, mocks.setLoading],
}));
vi.mock("@raycast/api", () => ({
  Action: { SubmitForm: "SubmitForm" },
  ActionPanel: "ActionPanel",
  Clipboard: { copy: vi.fn() },
  Form: Object.assign(() => null, {
    Description: "Description",
    FilePicker: "FilePicker",
    Dropdown: Object.assign(() => null, { Item: "Item" }),
  }),
  showToast: mocks.showToast,
  Toast: { Style: { Success: "success", Failure: "failure", Animated: "animated" } },
  useNavigation: () => ({ pop: mocks.pop }),
}));
vi.mock("@raycast/utils", () => ({ useForm: mocks.useForm }));
vi.mock("../lib/api", () => ({ uploadFile: vi.fn(), EXPIRY_OPTIONS: [] }));
vi.mock("../lib/storage", () => ({ addRecentUpload: vi.fn() }));
vi.mock("../lib/upload-batch", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/upload-batch")>()),
  uploadFilesBatch: mocks.uploadFilesBatch,
}));
import UploadForm from "./upload-form";
import { UploadBatchError } from "../lib/upload-batch";

function submit(values: Values) {
  const options = mocks.useForm.mock.calls[0][0] as { onSubmit: (values: Values) => Promise<void> };
  mocks.currentFiles = values.file;
  return options.onSubmit(values);
}

describe("shared upload form", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    Object.assign(mocks.toast, { style: "", title: "", message: "" });
    mocks.showToast.mockResolvedValue(mocks.toast);
    mocks.setValue.mockImplementation((_id: string, value: string[] | ((current: string[]) => string[])) => {
      mocks.currentFiles = typeof value === "function" ? value(mocks.currentFiles) : value;
    });
    mocks.useForm.mockReturnValue({
      handleSubmit: vi.fn(),
      itemProps: { file: {}, time: {} },
      setValue: mocks.setValue,
    });
  });

  it("prefills Finder paths but starts no upload before the user submits", () => {
    UploadForm({ initialFiles: ["/synthetic/one.txt"] });
    expect(mocks.useForm).toHaveBeenCalledWith(
      expect.objectContaining({
        initialValues: { file: ["/synthetic/one.txt"], time: "24h" },
      }),
    );
    expect(mocks.uploadFilesBatch).not.toHaveBeenCalled();
  });

  it("uploads the edited selection and chosen expiry, then closes on success", async () => {
    UploadForm({ initialFiles: ["/synthetic/one.txt"] });
    mocks.uploadFilesBatch.mockResolvedValue({
      uploads: [{ filename: "two.txt", url: "https://litter.catbox.moe/two.txt" }],
    });
    await submit({ file: ["/synthetic/two.txt"], time: "12h" });
    expect(mocks.uploadFilesBatch).toHaveBeenCalledWith(["/synthetic/two.txt"], "12h", expect.any(Object));
    expect(mocks.pop).toHaveBeenCalledOnce();
    expect(mocks.toast.style).toBe("success");
    expect(mocks.setLoading).toHaveBeenLastCalledWith(false);
  });

  it("does not upload an empty selection", async () => {
    UploadForm({});
    await submit({ file: [], time: "24h" });
    expect(mocks.uploadFilesBatch).not.toHaveBeenCalled();
    expect(mocks.pop).not.toHaveBeenCalled();
  });

  it("keeps the form open and shows preflight failures", async () => {
    UploadForm({});
    mocks.uploadFilesBatch.mockRejectedValue(new Error("large.bin exceeds the 1 GB limit"));
    await submit({ file: ["/synthetic/large.bin"], time: "24h" });
    expect(mocks.pop).not.toHaveBeenCalled();
    expect(mocks.toast.message).toContain("large.bin exceeds");
    expect(mocks.setLoading).toHaveBeenLastCalledWith(false);
  });

  it("reports a partial batch and preserves the form for correcting the selection", async () => {
    UploadForm({});
    mocks.uploadFilesBatch.mockRejectedValue(
      new UploadBatchError({
        message: "Network down",
        uploads: [{ filename: "one.txt", url: "https://litter.catbox.moe/one.txt" }],
        totalFiles: 2,
        clipboardCopied: true,
        failedFilename: "two.txt",
      }),
    );
    await submit({ file: ["/synthetic/one.txt", "/synthetic/two.txt"], time: "24h" });
    expect(mocks.pop).not.toHaveBeenCalled();
    expect(mocks.toast.title).toBe("1 of 2 files uploaded");
    expect(mocks.toast.message).toContain("two.txt failed: Network down");
    expect(mocks.toast.message).toContain("View Recent Uploads");
    expect(mocks.currentFiles).toEqual(["/synthetic/two.txt"]);
  });

  it("does not start a second batch while the first submission is pending", async () => {
    UploadForm({});
    let finish!: (result: { uploads: { filename: string }[] }) => void;
    mocks.uploadFilesBatch.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const first = submit({ file: ["/synthetic/one.txt"], time: "24h" });
    await Promise.resolve();
    await submit({ file: ["/synthetic/one.txt"], time: "24h" });
    expect(mocks.uploadFilesBatch).toHaveBeenCalledOnce();
    finish({ uploads: [{ filename: "one.txt" }] });
    await first;
  });
  it("preserves additions and removals made while a failed batch is running", async () => {
    UploadForm({});
    let fail!: (error: UploadBatchError) => void;
    mocks.uploadFilesBatch.mockReturnValue(
      new Promise((_resolve, reject) => {
        fail = reject;
      }),
    );
    const pending = submit({ file: ["/synthetic/one.txt", "/synthetic/two.txt"], time: "24h" });
    await Promise.resolve();
    // The user removes two.txt and adds three.txt while one.txt uploads.
    mocks.currentFiles = ["/synthetic/one.txt", "/synthetic/three.txt"];
    fail(
      new UploadBatchError({
        message: "Network down",
        uploads: [{ filename: "one.txt", url: "https://litter.catbox.moe/one.txt" }],
        totalFiles: 2,
        clipboardCopied: true,
        failedFilename: "two.txt",
      }),
    );
    await pending;
    expect(mocks.currentFiles).toEqual(["/synthetic/three.txt"]);
    expect(mocks.pop).not.toHaveBeenCalled();
  });

  it("releases the submission guard and loading state if toast creation fails", async () => {
    UploadForm({});
    mocks.showToast.mockRejectedValueOnce(new Error("Toast unavailable"));
    await expect(submit({ file: ["/synthetic/one.txt"], time: "24h" })).rejects.toThrow("Toast unavailable");
    expect(mocks.setLoading).toHaveBeenLastCalledWith(false);
    expect(mocks.uploadFilesBatch).not.toHaveBeenCalled();
    expect(mocks.pop).not.toHaveBeenCalled();

    mocks.uploadFilesBatch.mockResolvedValue({
      uploads: [{ filename: "one.txt", url: "https://litter.catbox.moe/one.txt" }],
    });
    await submit({ file: ["/synthetic/one.txt"], time: "24h" });
    expect(mocks.uploadFilesBatch).toHaveBeenCalledOnce();
    expect(mocks.pop).toHaveBeenCalledOnce();
    expect(mocks.setLoading).toHaveBeenLastCalledWith(false);
  });
});
