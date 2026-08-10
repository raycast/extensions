import { getPreferenceValues as _getPreferenceValues } from "@raycast/api";
import {
  prepareItemsForCache as _prepareItemsForCache,
  prepareFoldersForCache as _prepareFoldersForCache,
} from "~/components/searchVault/utils/caching";
import useVaultCaching from "~/components/searchVault/utils/useVaultCaching";
import { CACHE_KEYS } from "~/constants/general";
import { Cache as _Cache } from "~/utils/cache";
import { getMockFolders, getMockItems } from "~/utils/testing/mocks";

const Cache = _Cache as jest.Mocked<typeof _Cache>;
const getPreferenceValues = _getPreferenceValues as jest.MockedFunction<typeof _getPreferenceValues>;
const prepareItemsForCache = _prepareItemsForCache as jest.MockedFunction<typeof _prepareItemsForCache>;
const prepareFoldersForCache = _prepareFoldersForCache as jest.MockedFunction<typeof _prepareFoldersForCache>;

const MOCK_IV = "mock_initialization_vector";
const MOCK_ITEMS = getMockItems(3);
const MOCK_FOLDERS = getMockFolders(1);
const STRINGIFIED_MOCK_VAULT = JSON.stringify({ items: MOCK_ITEMS, folders: MOCK_FOLDERS });

const encryptMockFn = jest.fn((value: string) => ({ content: value, iv: MOCK_IV }));
const decryptMockFn = jest.fn((value: string) => value);
jest.mock("~/utils/hooks/useContentEncryptor", () => ({
  useContentEncryptor: () => ({
    encrypt: encryptMockFn,
    decrypt: decryptMockFn,
  }),
}));

jest.mock("~/components/searchVault/utils/caching", () => ({
  ...jest.requireActual("~/components/searchVault/utils/caching"),
  prepareItemsForCache: jest.fn((items: any[]) => items),
  prepareFoldersForCache: jest.fn((folders: any[]) => folders),
}));

describe("useVaultCache", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Cache.get.mockReturnValueOnce(MOCK_IV).mockReturnValueOnce(STRINGIFIED_MOCK_VAULT);
  });

  test("should correctly return the cached vault", () => {
    const { getCachedVault } = useVaultCaching();
    const result = getCachedVault();

    expect(result).toEqual({ items: MOCK_ITEMS, folders: MOCK_FOLDERS });
  });

  test("should correctly cache the vault", () => {
    const { cacheVault } = useVaultCaching();
    cacheVault(MOCK_ITEMS, MOCK_FOLDERS);

    expect(encryptMockFn).toHaveBeenCalledTimes(1);
    expect(encryptMockFn).toHaveBeenCalledWith(STRINGIFIED_MOCK_VAULT);
    expect(Cache.set).toHaveBeenCalledTimes(2);
    expect(Cache.set).toHaveBeenNthCalledWith(1, CACHE_KEYS.VAULT, STRINGIFIED_MOCK_VAULT);
    expect(Cache.set).toHaveBeenNthCalledWith(2, CACHE_KEYS.IV, MOCK_IV);
  });

  test("should not return cache or return any cached values if caching is not active", () => {
    getPreferenceValues.mockReturnValueOnce({ shouldCacheVaultItems: false });
    const { getCachedVault, cacheVault } = useVaultCaching();
    const cachedVault = getCachedVault();
    cacheVault(MOCK_ITEMS, MOCK_FOLDERS);

    expect(cachedVault).toEqual({ items: [], folders: [] });
    expect(decryptMockFn).not.toHaveBeenCalled();
    expect(encryptMockFn).not.toHaveBeenCalled();
    expect(prepareItemsForCache).not.toHaveBeenCalled();
    expect(prepareFoldersForCache).not.toHaveBeenCalled();
    expect(Cache.get).not.toHaveBeenCalled();
    expect(Cache.set).not.toHaveBeenCalled();
  });

  test("should clear cache if caching is disabled and it's not empty", () => {
    getPreferenceValues.mockReturnValueOnce({ shouldCacheVaultItems: false });
    jest.replaceProperty(Cache, "isEmpty", false);
    useVaultCaching();

    expect(Cache.clear).toHaveBeenCalledTimes(1);
  });
});
