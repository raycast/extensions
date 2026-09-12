import { getPreferenceValues as _getPreferenceValues } from "@raycast/api";
import { useContentEncryptor } from "~/utils/hooks/useContentEncryptor";

const getPreferenceValues = _getPreferenceValues as jest.Mock;

const MOCK_CLIENT_SECRET = "test";

describe("useContentEncryptor", () => {
  beforeAll(() => {
    getPreferenceValues.mockReturnValue({ clientSecret: MOCK_CLIENT_SECRET });
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
