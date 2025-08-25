import { AuthCode, AuthData, AuthKey, AuthEntity } from "../types";
import { generateTOTP, getProgress, getRemainingSeconds } from "../utils/totp";

/**
 * Mock authenticator data for testing
 */
const MOCK_AUTH_ENTITIES: AuthData[] = [
  {
    id: "1",
    name: "Google",
    issuer: "Google",
    secret: "JBSWY3DPEHPK3PXP",
    type: "totp",
    algorithm: "sha1",
    digits: 6,
    period: 30,
    updatedAt: Date.now(),
  },
  {
    id: "2",
    name: "GitHub",
    issuer: "GitHub",
    secret: "JBSWY3DPEHPK3PXQ",
    type: "totp",
    algorithm: "sha1",
    digits: 6,
    period: 30,
    updatedAt: Date.now(),
  },
  {
    id: "3",
    name: "Microsoft",
    issuer: "Microsoft",
    secret: "JBSWY3DPEHPK3PXR",
    type: "totp",
    algorithm: "sha1",
    digits: 6,
    period: 30,
    updatedAt: Date.now(),
  },
  {
    id: "4",
    name: "Steam",
    issuer: "Steam",
    secret: "JBSWY3DPEHPK3PXS",
    type: "steam",
    algorithm: "sha1",
    digits: 5,
    period: 30,
    updatedAt: Date.now(),
  },
  {
    id: "5",
    name: "AWS",
    issuer: "Amazon",
    secret: "JBSWY3DPEHPK3PXT",
    type: "totp",
    algorithm: "sha256",
    digits: 6,
    period: 30,
    updatedAt: Date.now(),
  },
];

/**
 * Mock auth key for testing
 */
const MOCK_AUTH_KEY: AuthKey = {
  userID: 1,
  encryptedKey: "encrypted-key-data",
  header: "header-data",
};

/**
 * Generate mock auth codes from auth entities
 */
export const generateMockAuthCodes = (): AuthCode[] => {
  return MOCK_AUTH_ENTITIES.map((entity) => {
    let code: string;
    let remainingSeconds: number | undefined;
    let progress: number | undefined;

    if (entity.type === "hotp") {
      // Simple mock HOTP implementation for testing
      code = "123456";
    } else {
      code = generateTOTP(entity.secret, entity.period, entity.digits, entity.algorithm);
      remainingSeconds = getRemainingSeconds(entity.period);
      progress = getProgress(entity.period);
    }

    return {
      ...entity,
      code,
      remainingSeconds,
      progress,
    };
  });
};

/**
 * Get mock auth entities
 */
export const getMockAuthEntities = (): AuthData[] => {
  return [...MOCK_AUTH_ENTITIES];
};

/**
 * Get mock auth key
 */
export const getMockAuthKey = (): AuthKey => {
  return { ...MOCK_AUTH_KEY };
};

/**
 * Mock storage class for testing
 */
export class MockStorage {
  private authEntities: AuthData[];
  private authKey: AuthKey;
  private token: string | null = null;
  private email: string | null = null;

  constructor() {
    this.authEntities = getMockAuthEntities();
    this.authKey = getMockAuthKey();
  }

  async storeAuthEntities(entities: AuthData[]): Promise<void> {
    this.authEntities = entities;
  }

  async getAuthEntities(): Promise<AuthData[]> {
    return [...this.authEntities];
  }

  async storeAuthKey(key: AuthKey): Promise<void> {
    this.authKey = key;
  }

  async getAuthKey(): Promise<AuthKey | null> {
    return { ...this.authKey };
  }

  async storeToken(token: string): Promise<void> {
    this.token = token;
  }

  async getToken(): Promise<string | null> {
    return this.token;
  }

  async storeEmail(email: string): Promise<void> {
    this.email = email;
  }

  async getEmail(): Promise<string | null> {
    return this.email;
  }

  async clearAll(): Promise<void> {
    this.token = null;
    this.email = null;
  }
}

/**
 * Use this class to override Ente API methods with mock implementations
 */
export class MockEnteApiClient {
  /**
   * Mock login implementation
   */
  async login(email: string): Promise<{ token: string; userID: number }> {
    // Simulate success for any valid-looking email
    if (email && email.includes("@")) {
      return {
        token: "mock-auth-token-" + Date.now(),
        userID: 1,
      };
    }

    throw new Error("Login failed. Please check your credentials and try again.");
  }

  /**
   * Mock auth key retrieval
   */
  async getAuthKey(): Promise<AuthKey> {
    return getMockAuthKey();
  }

  /**
   * Mock auth entities retrieval
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getAuthDiff(sinceTime = 0, limit = 500): Promise<AuthEntity[]> {
    // In real implementation, this would return AuthEntity objects
    // For mock, we'll convert AuthData to AuthEntity format
    const mockEntities = getMockAuthEntities();

    // Convert to AuthEntity format with encrypted data
    return mockEntities.map((entity) => {
      // Create a simple mock encryption using the entity ID as the header
      const header = `mock-header-${entity.id}`;
      const encryptedData = `mock-encrypted-data-${entity.id}`;

      return {
        id: entity.id,
        encryptedData,
        header,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDeleted: false,
      };
    });
  }

  /**
   * Set token (no-op in mock)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setToken(token: string): void {}

  /**
   * Test connection (always succeeds in mock)
   */
  async testConnection(): Promise<void> {}
}
