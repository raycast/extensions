/**
 * bunq API authentication and session management.
 *
 * This module handles the complete authentication flow with the bunq API:
 *
 * 1. **Installation**: Register the client's public key with bunq and receive
 *    an installation token and the server's public key.
 *
 * 2. **Device Registration**: Register this device (the Raycast extension)
 *    with the user's API key to allow API access.
 *
 * 3. **Session Creation**: Create an authenticated session that allows
 *    making API calls on behalf of the user.
 *
 * The authentication state is persisted in Raycast's LocalStorage so that
 * subsequent launches can reuse the existing installation and only need
 * to refresh the session.
 *
 * @module api/auth
 */

import { post } from "./client";
import { generateRsaKeyPair } from "../lib/crypto";
import {
  setInstallationToken,
  setServerPublicKey,
  setDeviceId,
  setSessionToken,
  setUserId,
  setRsaPublicKey,
  setRsaPrivateKey,
  getInstallationToken,
  getRsaPrivateKey,
  getApiKey,
  setApiKeyFingerprint,
  setStoredEnvironment,
  getCurrentEnvironment,
} from "../lib/storage";
import { logger } from "../lib/logger";

/**
 * Response structure for the /installation endpoint.
 */
interface InstallationResponse {
  Token: { token: string };
  ServerPublicKey?: { server_public_key: string };
}

/**
 * Response structure for the /device-server endpoint.
 */
interface DeviceServerResponse {
  Id: { id: number };
}

/**
 * Response structure for the /session-server endpoint.
 */
interface SessionServerResponse {
  Token: { token: string };
  UserPerson?: { id: number };
  UserCompany?: { id: number };
  UserApiKey?: { id: number };
}

/**
 * Creates a new installation with the bunq API.
 *
 * This is the first step in the authentication flow. It registers the
 * client's RSA public key with bunq and receives an installation token
 * for subsequent API calls.
 *
 * @param publicKey - The client's RSA public key in PEM format
 * @returns The installation token and server's public key
 * @throws Error if no installation token is received
 */
export async function createInstallation(publicKey: string): Promise<{ token: string; serverPublicKey: string }> {
  logger.info("Creating installation");

  const response = await post<InstallationResponse>("/installation", {
    client_public_key: publicKey,
  });

  let token = "";
  let serverPublicKey = "";

  for (const item of response.Response) {
    if ("Token" in item) {
      token = item.Token.token;
    }
    if ("ServerPublicKey" in item) {
      serverPublicKey = item.ServerPublicKey?.server_public_key || "";
    }
  }

  if (!token) {
    logger.error("No installation token in response");
    throw new Error("No installation token received");
  }

  if (!serverPublicKey) {
    logger.warn("No server public key in installation response - signature verification will be skipped");
  }

  logger.info("Installation created successfully");
  return { token, serverPublicKey };
}

/**
 * Registers this device with the bunq API.
 *
 * This is the second step in the authentication flow. It registers the
 * device (this Raycast extension) with the user's API key, allowing
 * the device to make API calls.
 *
 * Note: The `permitted_ips: ["*"]` setting allows this device registration
 * to be used from any IP address. This is necessary for a desktop app
 * where the user's IP may change.
 *
 * @param installationToken - The token received from createInstallation
 * @param apiKey - The user's bunq API key
 * @param privateKey - The client's RSA private key for request signing
 * @returns The device ID assigned by bunq
 * @throws Error if no device ID is received
 */
export async function registerDevice(installationToken: string, apiKey: string, privateKey: string): Promise<number> {
  logger.info("Registering device");

  const response = await post<DeviceServerResponse>(
    "/device-server",
    {
      description: "Raycast bunq Extension",
      secret: apiKey,
      permitted_ips: ["*"],
    },
    {
      authToken: installationToken,
      sign: true,
      privateKey,
    },
  );

  for (const item of response.Response) {
    if ("Id" in item) {
      logger.info("Device registered", { deviceId: item.Id.id });
      return item.Id.id;
    }
  }

  logger.error("No device ID in response");
  throw new Error("No device ID received");
}

/**
 * Creates a new authenticated session with the bunq API.
 *
 * This is the third step in the authentication flow. It creates a session
 * that allows making API calls on behalf of the user. The session token
 * should be included in subsequent API requests.
 *
 * Sessions expire after some time (typically 1 week), requiring a refresh.
 *
 * @param installationToken - The token received from createInstallation
 * @param apiKey - The user's bunq API key
 * @param privateKey - The client's RSA private key for request signing
 * @returns The session token and user ID
 * @throws Error if the session response is invalid
 */
export async function createSession(
  installationToken: string,
  apiKey: string,
  privateKey: string,
): Promise<{ token: string; userId: number }> {
  logger.info("Creating session");

  const response = await post<SessionServerResponse>(
    "/session-server",
    {
      secret: apiKey,
    },
    {
      authToken: installationToken,
      sign: true,
      privateKey,
    },
  );

  let token = "";
  let userId = 0;

  for (const item of response.Response) {
    if ("Token" in item) {
      token = item.Token.token;
    }
    if ("UserPerson" in item && item.UserPerson) {
      userId = item.UserPerson.id;
    }
    if ("UserCompany" in item && item.UserCompany) {
      userId = item.UserCompany.id;
    }
    if ("UserApiKey" in item && item.UserApiKey) {
      userId = item.UserApiKey.id;
    }
  }

  if (!token || !userId) {
    logger.error("Invalid session response", { hasToken: !!token, hasUserId: !!userId });
    throw new Error("Invalid session response");
  }

  logger.info("Session created", { userId });
  return { token, userId };
}

/**
 * Performs the complete initial setup with the bunq API.
 *
 * This function handles the entire authentication flow for first-time setup:
 * 1. Generates a new RSA key pair
 * 2. Creates an installation with bunq
 * 3. Registers this device
 * 4. Creates an authenticated session
 * 5. Stores all credentials in LocalStorage
 *
 * After this function completes successfully, the extension is ready to
 * make API calls. Subsequent launches should use refreshSession() instead.
 *
 * @throws Error if the API key is not configured or any step fails
 */
export async function performFullSetup(): Promise<void> {
  const apiKey = getApiKey();

  if (!apiKey) {
    logger.error("API key not configured");
    throw new Error("API key not configured. Please set it in Raycast extension settings.");
  }

  logger.info("Performing full setup");

  // Generate RSA key pair
  logger.debug("Generating RSA key pair");
  const keyPair = generateRsaKeyPair();

  await setRsaPublicKey(keyPair.publicKey);
  await setRsaPrivateKey(keyPair.privateKey);

  // Create installation
  const installation = await createInstallation(keyPair.publicKey);
  await setInstallationToken(installation.token);
  await setServerPublicKey(installation.serverPublicKey);

  // Register device
  const deviceId = await registerDevice(installation.token, apiKey, keyPair.privateKey);
  await setDeviceId(deviceId.toString());

  // Create session
  const session = await createSession(installation.token, apiKey, keyPair.privateKey);
  await setSessionToken(session.token);
  await setUserId(session.userId.toString());

  // Store the API key fingerprint and environment to detect preference changes
  await setApiKeyFingerprint(apiKey);
  await setStoredEnvironment(getCurrentEnvironment());

  logger.info("Full setup completed successfully");
}

/**
 * Refreshes the session using existing credentials.
 *
 * This function creates a new session using the existing installation
 * and RSA keys. Use this after the initial setup when the session has
 * expired or needs to be refreshed.
 *
 * If the installation credentials are missing (e.g., after clearing
 * storage), this function will automatically perform a full setup.
 *
 * @throws Error if the API key is not configured
 */
export async function refreshSession(): Promise<void> {
  const apiKey = getApiKey();
  const [installationToken, privateKey] = await Promise.all([getInstallationToken(), getRsaPrivateKey()]);

  if (!apiKey) {
    logger.error("API key not configured");
    throw new Error("API key not configured. Please set it in Raycast extension settings.");
  }

  if (!installationToken || !privateKey) {
    // Need to do full setup
    logger.info("Missing installation credentials, performing full setup");
    await performFullSetup();
    return;
  }

  logger.info("Refreshing session");

  const session = await createSession(installationToken, apiKey, privateKey);
  await setSessionToken(session.token);
  await setUserId(session.userId.toString());

  logger.info("Session refreshed successfully");
}
