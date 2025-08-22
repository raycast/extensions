import { SRP, SrpClient } from "fast-srp-hap";
import { v4 as uuidv4 } from "uuid";
import { getUnauthenticatedApiClient } from "./api";
import { deriveKeyEncryptionKey, deriveLoginKey } from "./crypto";
import { SRPAttributes, CreateSRPSessionResponse, SRPVerificationResponse } from "../types";

/**
 * A local-only structure holding information required for SRP setup.
 */
export interface SRPSetupAttributes {
  srpUserID: string;
  srpSalt: string;
  srpVerifier: string;
  loginSubKey: string;
}

/**
 * Fetch the SRP attributes from remote for the Ente user with the provided email.
 * Exactly matches web implementation getSRPAttributes function.
 */
export const getSRPAttributes = async (email: string): Promise<SRPAttributes | undefined> => {
  try {
    const apiClient = getUnauthenticatedApiClient(); // Use unauthenticated client for SRP
    const attributes = await apiClient.getSRPAttributes(email);
    return attributes;
  } catch (error: unknown) {
    if (error && typeof error === "object" && "status" in error && error.status === 404) {
      return undefined;
    }
    throw error;
  }
};

/**
 * Determine authentication method based on SRP attributes and MFA status.
 * Matches web implementation logic in LoginContents.tsx.
 */
export const determineAuthMethod = async (email: string): Promise<"srp" | "email"> => {
  const srpAttributes = await getSRPAttributes(email);

  if (!srpAttributes) {
    return "email";
  }

  if (srpAttributes.isEmailMFAEnabled) {
    return "email";
  }
  return "srp";
};

/**
 * Generate SRP setup attributes from the provided KEK.
 * Matches web implementation generateSRPSetupAttributes function.
 */
export const generateSRPSetupAttributes = async (kek: string): Promise<SRPSetupAttributes> => {
  const loginSubKey = await deriveSRPLoginSubKey(kek);

  // Museum schema requires this to be a UUID.
  const srpUserID = uuidv4();
  const srpSalt = await generateDeriveKeySalt();

  const srpVerifier = bufferToB64(
    SRP.computeVerifier(SRP.params["4096"], b64ToBuffer(srpSalt), Buffer.from(srpUserID), b64ToBuffer(loginSubKey)),
  );

  return { srpUserID, srpSalt, srpVerifier, loginSubKey };
};

/**
 * Derive a "login sub-key" for use as the SRP user password.
 * Exactly matches web implementation deriveSRPLoginSubKey function.
 */
const deriveSRPLoginSubKey = async (kek: string): Promise<string> => {
  const kekBuffer = Buffer.from(kek, "base64");

  // Use the exact same logic as web implementation:
  // const kekSubKeyBytes = await deriveSubKeyBytes(kek, 32, 1, "loginctx");
  // return toB64(kekSubKeyBytes.slice(0, 16));
  const loginKey = await deriveLoginKey(kekBuffer);

  // Return the login key as base64 (matching web implementation)
  const result = bufferToB64(loginKey);
  return result;
};

/**
 * Generate a salt for key derivation.
 * Matches web implementation generateDeriveKeySalt function.
 */
const generateDeriveKeySalt = async (): Promise<string> => {
  const salt = new Uint8Array(32);
  crypto.getRandomValues(salt);
  return bufferToB64(salt);
};

/**
 * Generate an SRP client instance.
 * Matches web implementation generateSRPClient function.
 */
const generateSRPClient = async (srpSalt: string, srpUserID: string, loginSubKey: string): Promise<SrpClient> => {
  return new Promise<SrpClient>((resolve, reject) => {
    SRP.genKey((err, clientKey) => {
      if (err) {
        reject(err);
        return;
      }

      try {
        const client = new SrpClient(
          SRP.params["4096"],
          b64ToBuffer(srpSalt),
          Buffer.from(srpUserID),
          b64ToBuffer(loginSubKey),
          clientKey!,
          false,
        );
        resolve(client);
      } catch (error) {
        reject(error);
      }
    });
  });
};

/**
 * Create an SRP session on remote.
 * Matches web implementation createSRPSession function.
 */
const createSRPSession = async (srpUserID: string, srpA: string): Promise<CreateSRPSessionResponse> => {
  const apiClient = getUnauthenticatedApiClient(); // Use unauthenticated client for SRP
  const response = await apiClient.createSRPSession(srpUserID, srpA);

  return response;
};

/**
 * Verify an SRP session on remote.
 * Matches web implementation verifySRPSession function.
 */
const verifySRPSession = async (
  sessionID: string,
  srpUserID: string,
  srpM1: string,
): Promise<SRPVerificationResponse> => {
  try {
    const apiClient = getUnauthenticatedApiClient(); // Use unauthenticated client for SRP
    const response = await apiClient.verifySRPSession(srpUserID, sessionID, srpM1);
    return response;
  } catch (error: unknown) {
    if (error && typeof error === "object" && "status" in error && error.status === 401) {
      throw new Error("SRP verification failed (HTTP 401 Unauthorized)");
    }
    throw error;
  }
};

/**
 * Perform SRP authentication.
 * Exactly matches web implementation verifySRP function flow.
 */
export const performSRPAuthentication = async (
  srpAttributes: SRPAttributes,
  kek: string,
): Promise<SRPVerificationResponse> => {
  const loginSubKey = await deriveSRPLoginSubKey(kek);
  const srpClient = await generateSRPClient(srpAttributes.srpSalt, srpAttributes.srpUserID, loginSubKey);

  // Send A, obtain B - matches web implementation
  const srpA = bufferToB64(srpClient.computeA());

  const { srpB, sessionID } = await createSRPSession(srpAttributes.srpUserID, srpA);

  srpClient.setB(b64ToBuffer(srpB));

  // Send M1, obtain M2 - matches web implementation
  const srpM1 = bufferToB64(srpClient.computeM1());

  const response = await verifySRPSession(sessionID, srpAttributes.srpUserID, srpM1);

  // Verify M2 - matches web implementation
  srpClient.checkM2(b64ToBuffer(response.srpM2));

  return response;
};

/**
 * SRP Authentication Service - simplified to match web implementation patterns
 */
export class SRPAuthenticationService {
  static async performSRPAuthentication(email: string, password: string): Promise<SRPVerificationResponse> {
    // Get SRP attributes - matches web implementation flow
    const srpAttributes = await getSRPAttributes(email);
    if (!srpAttributes) {
      throw new Error("SRP attributes not found for user");
    }

    // Derive KEK from password using SRP attributes - matches web implementation
    const kekBuffer = await deriveKeyEncryptionKey(
      password,
      srpAttributes.kekSalt,
      srpAttributes.memLimit,
      srpAttributes.opsLimit,
    );
    const kek = bufferToB64(kekBuffer);

    // Perform SRP authentication - matches web implementation verifySRP function
    return await performSRPAuthentication(srpAttributes, kek);
  }
}

// Utility functions - match web implementation
function bufferToB64(buffer: Uint8Array | Buffer): string {
  return Buffer.from(buffer).toString("base64");
}

function b64ToBuffer(b64: string): Buffer {
  return Buffer.from(b64, "base64");
}
