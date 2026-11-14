// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test } from "vitest";

import { migrateLegacyAccount, saveAccount } from "@/lib/accounts";

import useAccounts from "@/hooks/useAccounts";

import { LocalStorage, storage } from "./mocks/raycast";

afterEach(cleanup);
beforeEach(() => storage.clear());

test("a late account read cannot replace the account imported by migration", async () => {
  let release!: (value: undefined) => void;
  LocalStorage.getItem.mockImplementationOnce(
    () =>
      new Promise<undefined>((resolve) => {
        release = resolve;
      }),
  );
  const { result } = renderHook(() => useAccounts());
  await act(async () => {
    await migrateLegacyAccount({ publication: "example", sessionCookie: "synthetic" }, []);
    await result.current.reload();
  });
  const imported = result.current.accounts[0];
  expect(imported.publication).toBe("example");
  expect(result.current.selectedId).toBe(imported.id);

  await act(async () => release(undefined));
  expect(result.current.accounts).toEqual([imported]);
  expect(result.current.selectedId).toBe(imported.id);
  expect(result.current.isLoading).toBe(false);
  expect(result.current.error).toBeUndefined();
});

test("an older failure cannot end a newer account reload or display an error", async () => {
  let rejectOld!: (error: Error) => void;
  let releaseNew!: (value: string | undefined) => void;
  await saveAccount({ id: "first", label: "First", publication: "example", sessionCookie: "synthetic" });
  LocalStorage.getItem
    .mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectOld = reject;
        }),
    )
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseNew = resolve;
        }),
    );
  const { result } = renderHook(() => useAccounts());
  let reload!: Promise<void>;
  act(() => {
    reload = result.current.reload();
  });
  await act(async () => rejectOld(new Error("Old read failed")));
  expect(result.current.isLoading).toBe(true);
  expect(result.current.error).toBeUndefined();

  await act(async () => {
    releaseNew(storage.get("substack.accounts.v1"));
    await reload;
  });
  expect(result.current.selectedId).toBe("first");
  expect(result.current.isLoading).toBe(false);
  expect(result.current.error).toBeUndefined();
});

test("the current account reload still reports read failures", async () => {
  LocalStorage.getItem.mockRejectedValueOnce(new Error("Read failed"));
  const { result } = renderHook(() => useAccounts());
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.error).toBe("Could not read saved Substack data. Try again before changing accounts.");
});
