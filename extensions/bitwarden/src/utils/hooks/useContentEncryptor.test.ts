import { getPreferenceValues } from "@raycast/api";
import React from "react";
import { useContentEncryptor } from "~/utils/hooks/useContentEncryptor";

const MOCK_CLIENT_SECRET = "test";

jest.mock("@raycast/api", () => ({ getPreferenceValues: jest.fn() }), { virtual: true });

describe("useContentEncryptor", () => {
  beforeAll(() => {
    (getPreferenceValues as jest.Mock).mockReturnValue({ clientSecret: MOCK_CLIENT_SECRET });
    jest.spyOn(React, "useMemo").mockImplementation((fn) => fn());
  });

  it("should encrypt and decrypt data", () => {
    const { encrypt, decrypt } = useContentEncryptor();
    const plainData = "thisisatest";
    const { content, iv } = encrypt(plainData);
    expect(decrypt(content, iv)).toEqual(plainData);
  });

  it("should not decrypt with the wrong initialization vector", () => {
    const { encrypt, decrypt } = useContentEncryptor();
    const { content } = encrypt("something");
    expect(() => decrypt(content, "wrongiv")).toThrowError();
  });
});
