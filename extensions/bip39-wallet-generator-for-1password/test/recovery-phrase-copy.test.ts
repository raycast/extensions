import { beforeEach, describe, expect, it, vi } from "vitest";

import { confirmAndCopyRecoveryPhrase } from "../src/recovery-phrase-copy";

const MNEMONIC = "test test test test test test test test test test test junk";

const confirmMock = vi.fn<() => Promise<boolean>>();
const writeMock =
  vi.fn<(content: string, options: { concealed: true }) => Promise<void>>();

describe("recovery phrase copy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    writeMock.mockResolvedValue();
  });

  it("leaves the clipboard unchanged when confirmation is canceled", async () => {
    confirmMock.mockResolvedValue(false);

    await expect(
      confirmAndCopyRecoveryPhrase(MNEMONIC, {
        confirm: confirmMock,
        write: writeMock,
      }),
    ).resolves.toBe(false);

    expect(confirmMock).toHaveBeenCalledOnce();
    expect(writeMock).not.toHaveBeenCalled();
  });

  it("copies only after confirmation and keeps the content concealed", async () => {
    confirmMock.mockResolvedValue(true);

    await expect(
      confirmAndCopyRecoveryPhrase(MNEMONIC, {
        confirm: confirmMock,
        write: writeMock,
      }),
    ).resolves.toBe(true);

    expect(confirmMock).toHaveBeenCalledOnce();
    expect(writeMock).toHaveBeenCalledOnce();
    expect(writeMock).toHaveBeenCalledWith(MNEMONIC, {
      concealed: true,
    });
  });
});
