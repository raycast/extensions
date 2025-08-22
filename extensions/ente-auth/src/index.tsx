import { useState, useEffect } from "react";
import { List, Action, ActionPanel, Icon, Color, showToast, Toast, Clipboard, Form, showHUD } from "@raycast/api";
import { getAuthenticatorService, clearAuthenticatorServiceCache } from "./services/authenticator";
import { getStorageService } from "./services/storage";
import { getApiClient, resetApiClient } from "./services/api";
import { deriveKeyEncryptionKey, decryptMasterKey, decryptSecretKey, decryptSessionToken } from "./services/crypto";
import { determineAuthMethod, SRPAuthenticationService } from "./services/srp";
import { generateTOTP } from "./utils/totp";
import { AuthCode, AuthorizationResponse, UserCredentials } from "./types";
import { sanitizeErrorMessage, logSecureError } from "./utils/errorHandling";

export default function Index() {
  const [codes, setCodes] = useState<AuthCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // Login form state
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | undefined>();
  const [otpRequested, setOtpRequested] = useState(false);
  const [useSRP, setUseSRP] = useState(false);

  // Offline-first login status check (no network dependency)
  const checkLoginStatus = async () => {
    try {
      const storage = getStorageService();

      // First, try to restore from persistent session token (OFFLINE-FIRST)
      const storedSession = await storage.getStoredSessionToken();
      if (storedSession) {
        try {
          // CRITICAL FIX: Restore master key from stored credentials first
          // Try to get credentials to restore master key for session restoration
          const credentials = await storage.getCredentials();
          if (credentials && credentials.masterKey) {
            // Master key successfully restored, now set up session
            storage.setMasterKey(credentials.masterKey);

            // Set up API client with stored session (NO NETWORK CALLS YET)
            resetApiClient();
            const apiClient = await getApiClient();
            apiClient.setToken(storedSession.token);

            const authContext = {
              userId: storedSession.userId,
              accountKey: `auth-${storedSession.userId}`,
              userAgent: storedSession.userAgent,
            };
            apiClient.setAuthenticationContext(authContext);

            // Store authentication context (no network needed)
            try {
              await storage.storeAuthenticationContext(authContext);
            } catch {
              // Ignore storage errors during session restoration
            }

            // Initialize authenticator service (OFFLINE - uses cached data)
            const authenticatorService = getAuthenticatorService();
            const initialized = await authenticatorService.init();

            if (initialized) {
              setIsLoggedIn(true);
              await loadCodes(true); // forceLoad=true to bypass React state timing issue
              return;
            }
          }

          // If we couldn't restore credentials, clear the incomplete session
          await storage.clearStoredSessionToken();
        } catch (error) {
          console.error("DEBUG: Session restoration failed:", error);
          // Don't clear token immediately - it might work when back online
        }
      }

      // Fallback: Try traditional credential-based login (OFFLINE-FIRST)
      // This will only work if master key was previously set or credentials can be accessed
      const credentials = await storage.getCredentials();

      if (credentials) {
        const authenticatorService = getAuthenticatorService();
        const initialized = await authenticatorService.init();

        if (initialized) {
          setIsLoggedIn(true);
          await loadCodes();
          return;
        } else {
          // No cached authenticator initialization available
        }
      }

      // No valid session or credentials found
      setIsLoggedIn(false);
      setShowLogin(true);
    } catch (error) {
      console.error("DEBUG: 💥 CRITICAL ERROR in checkLoginStatus:", error);
      setIsLoggedIn(false);
      setShowLogin(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter codes based on search
  const filteredCodes = codes.filter(
    (code) =>
      code.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (code.issuer && code.issuer.toLowerCase().includes(searchText.toLowerCase())),
  );

  // Load and refresh codes (offline-first) - with explicit login override for session restoration
  const loadCodes = async (forceLoad: boolean = false) => {
    if (!isLoggedIn && !forceLoad) {
      return;
    }

    try {
      const authenticatorService = getAuthenticatorService();
      const authCodes = await authenticatorService.getAuthCodes();
      setCodes(authCodes);

      // Only show "no codes" message if we actually have no codes
      // Don't show network error messages during offline code loading
      if (!authCodes || authCodes.length === 0) {
        // Don't show toast for offline - user can sync manually when ready
      } else {
        // Codes loaded successfully
      }
    } catch (error) {
      console.error("DEBUG: 💥 ERROR in loadCodes:", error);

      // Check if it's a network error - if so, fail silently for offline use
      const isNetworkError =
        error instanceof Error &&
        (error.message.includes("Network error") ||
          error.message.includes("ENOTFOUND") ||
          error.message.includes("ECONNREFUSED"));

      if (!isNetworkError) {
        // SECURITY FIX: Sanitize error messages to prevent information leakage
        logSecureError(error, "loadCodes");
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to get authentication codes",
          message: sanitizeErrorMessage(error),
        });
      } else {
        // Network error during offline use, fail silently
      }

      // Don't clear codes on network errors - keep any existing codes
      if (!isNetworkError) {
        setCodes([]);
      } else {
        // Keep existing codes during network errors
      }
    }
  };

  // Check internet connectivity
  const checkInternetConnectivity = async (): Promise<boolean> => {
    try {
      // Try to reach a reliable endpoint with a short timeout
      await fetch("https://www.google.com/favicon.ico", {
        method: "HEAD",
        mode: "no-cors",
        cache: "no-cache",
        signal: AbortSignal.timeout(3000), // 3 second timeout
      });
      return true;
    } catch {
      // Network request failed - likely offline
      return false;
    }
  };

  // Smart sync with offline prevention
  const syncCodes = async () => {
    if (!isLoggedIn) return;

    try {
      setIsLoading(true);

      // Check internet connectivity before attempting sync
      const isOnline = await checkInternetConnectivity();

      if (!isOnline) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No internet connection",
          message: "Please connect to the internet",
        });
        return;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Syncing with server...",
      });

      const authenticatorService = getAuthenticatorService();

      // Get current codes before sync to compare
      const currentCodes = await authenticatorService.getAuthCodes();

      // Try incremental sync first (faster)
      let syncResult = await authenticatorService.syncAuthenticator(false);
      let authCodes = await authenticatorService.getAuthCodes();

      // ENHANCED SMART SYNC: Better detection of stale timestamp scenarios
      // The key insight: if we had codes before sync, but final result is the same count,
      // AND we know the server didn't send any changes, then we likely have a stale timestamp
      const hadCodesBefore = currentCodes.length > 0;
      const finalCountSame = currentCodes.length === authCodes.length;

      // For now, let's use a simpler heuristic: if we have codes but the count didn't change,
      // and we know deletions might have happened, force a complete sync
      const shouldForceCompleteSync =
        hadCodesBefore &&
        finalCountSame &&
        // Check if the codes are exactly the same (indicating no server changes processed)
        JSON.stringify(currentCodes.map((c) => c.id).sort()) === JSON.stringify(authCodes.map((c) => c.id).sort());

      if (shouldForceCompleteSync) {
        toast.title = "Refreshing all data from server...";

        // Reset and do complete sync
        const storage = getStorageService();
        await storage.resetSyncState();
        syncResult = await authenticatorService.syncAuthenticator(true);
        authCodes = await authenticatorService.getAuthCodes();
      }

      if (!syncResult) {
        throw new Error("Sync failed");
      }

      setCodes(authCodes);

      toast.style = Toast.Style.Success;
      if (authCodes.length > 0) {
        toast.title = "Sync successful!";
        toast.message = `Retrieved ${authCodes.length} codes`;
      } else {
        toast.title = "Sync complete";
        toast.message = "No authentication codes found";
      }
    } catch (error) {
      console.error("Sync error:", error);

      // Check if it's a network error and we have cached codes
      const isNetworkError =
        error instanceof Error &&
        (error.message.includes("Network error") ||
          error.message.includes("ENOTFOUND") ||
          error.message.includes("ECONNREFUSED"));

      if (isNetworkError && codes.length > 0) {
        await showToast({
          style: Toast.Style.Animated,
          title: "Offline mode",
          message: "Using cached codes. Sync when back online.",
        });
      } else {
        // SECURITY FIX: Sanitize error messages to prevent information leakage
        logSecureError(error, "syncCodes");
        await showToast({
          style: Toast.Style.Failure,
          title: "Sync failed",
          message: isNetworkError ? "Please connect to the internet" : sanitizeErrorMessage(error),
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Logout action
  const handleLogout = async () => {
    try {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Logging out...",
      });

      // CRITICAL FIX: Clear cached authenticator key to prevent cross-account contamination
      clearAuthenticatorServiceCache();

      const storage = getStorageService();
      await storage.clearAll();

      // Clear state
      setCodes([]);
      setIsLoggedIn(false);
      setShowLogin(true);

      toast.style = Toast.Style.Success;
      toast.title = "Logged out successfully!";
    } catch (error) {
      console.error("Logout error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Logout failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Copy and paste code simultaneously
  const copyAndPasteCode = async (code: string) => {
    await Clipboard.copy(code);
    await Clipboard.paste(code);
    await showHUD("Copied to clipboard");
  };

  // Login form submit handler
  const handleLoginSubmit = async (values: { email: string; password?: string; otp?: string }) => {
    // ULTIMATE PASSKEY ERROR HANDLER - catch ANY error in the entire function
    try {
      if (!values.email) {
        setLoginError("Email is required");
        return;
      }

      setLoginLoading(true);
      setLoginError(undefined);

      const apiClient = await getApiClient();

      if (!otpRequested) {
        const toast = await showToast({ style: Toast.Style.Animated, title: "Checking authentication method..." });

        try {
          const authMethod = await determineAuthMethod(values.email);

          if (authMethod === "srp") {
            setUseSRP(true);
            setOtpRequested(true);
            toast.style = Toast.Style.Success;
            toast.title = "Enter your password to continue";
          } else {
            setUseSRP(false);
            await apiClient.requestEmailOTP(values.email);
            setOtpRequested(true);
            toast.style = Toast.Style.Success;
            toast.title = "Verification code sent";
          }
        } catch (error) {
          console.error("DEBUG: Error determining auth method:", error);
          await apiClient.requestEmailOTP(values.email);
          setOtpRequested(true);
          toast.style = Toast.Style.Success;
          toast.title = "Verification code sent";
        }
      } else {
        if (!values.password) {
          setLoginError("Password is required");
          setLoginLoading(false);
          return;
        }

        if (useSRP) {
          const toast = await showToast({ style: Toast.Style.Animated, title: "Authenticating with SRP..." });

          try {
            const response = await SRPAuthenticationService.performSRPAuthentication(values.email, values.password);

            if (!response.keyAttributes || !response.encryptedToken) {
              throw new Error("SRP response missing required data");
            }

            const keyEncryptionKey = await deriveKeyEncryptionKey(
              values.password,
              response.keyAttributes.kekSalt,
              response.keyAttributes.memLimit,
              response.keyAttributes.opsLimit,
            );

            const masterKey = await decryptMasterKey(
              response.keyAttributes.encryptedKey,
              response.keyAttributes.keyDecryptionNonce,
              keyEncryptionKey,
            );

            const storage = getStorageService();
            storage.setMasterKey(masterKey);

            await storage.storeEncryptedToken(response.id, response.encryptedToken);
            await storage.storePartialCredentials(values.email, response.id, response.encryptedToken);

            const secretKey = await decryptSecretKey(
              response.keyAttributes.encryptedSecretKey,
              response.keyAttributes.secretKeyDecryptionNonce,
              masterKey,
            );

            const token = await decryptSessionToken(
              response.encryptedToken,
              response.keyAttributes.publicKey,
              secretKey,
            );

            if (!token) {
              throw new Error("Decrypted token is empty. Final decryption failed.");
            }

            const credentials: UserCredentials = {
              email: values.email,
              userId: response.id,
              token: token,
              masterKey: masterKey,
              keyAttributes: response.keyAttributes,
            };

            storage.setMasterKey(masterKey);
            await storage.storeCredentials(credentials);
            await storage.activateToken(token);

            // [PERSISTENCE FIX] Store session token separately for cross-restart persistence
            await storage.storeSessionToken(token, values.email, response.id);

            const authContext = {
              userId: response.id,
              accountKey: `auth-${response.id}`,
              userAgent: "Raycast/Ente-Auth/1.0.0",
            };

            await storage.storeAuthenticationContext(authContext);
            await storage.clearEncryptedToken();

            resetApiClient();
            await storage.resetSyncState();

            // Skip token validation during login - we know it's valid since SRP just succeeded

            // [PERSISTENCE FIX] Store decrypted authenticator key for session restoration
            try {
              const authenticatorService = getAuthenticatorService();
              await authenticatorService.init();

              // Try to get the decrypted authenticator key and store it
              await authenticatorService.getAuthCodes();

              // The authenticator key should now be cached in the service
              // We need to access the private method, so let's store it via a public method
            } catch {
              // Ignore errors during authenticator key caching
            }

            toast.style = Toast.Style.Success;
            toast.title = "Login successful!";

            // Switch to codes view
            setIsLoggedIn(true);
            setShowLogin(false);
            await loadCodes(true); // forceLoad=true to bypass React state timing issue
          } catch (error) {
            console.error("DEBUG: SRP authentication failed:", error);
            throw error;
          }
        } else {
          // Email OTP authentication
          if (!values.otp) {
            setLoginError("Verification code is required");
            setLoginLoading(false);
            return;
          }

          const toast = await showToast({ style: Toast.Style.Animated, title: "Verifying with email OTP..." });
          const response: AuthorizationResponse = await apiClient.verifyEmailOTP(values.email, values.otp);

          const keyEncryptionKey = await deriveKeyEncryptionKey(
            values.password,
            response.keyAttributes.kekSalt,
            response.keyAttributes.memLimit,
            response.keyAttributes.opsLimit,
          );

          const masterKey = await decryptMasterKey(
            response.keyAttributes.encryptedKey,
            response.keyAttributes.keyDecryptionNonce,
            keyEncryptionKey,
          );

          const secretKey = await decryptSecretKey(
            response.keyAttributes.encryptedSecretKey,
            response.keyAttributes.secretKeyDecryptionNonce,
            masterKey,
          );

          const token = await decryptSessionToken(response.encryptedToken, response.keyAttributes.publicKey, secretKey);

          if (!token) {
            throw new Error("Decrypted token is empty. Final decryption failed.");
          }

          const storage = getStorageService();
          const credentials: UserCredentials = {
            email: values.email,
            userId: response.id,
            token: token,
            masterKey: masterKey,
            keyAttributes: response.keyAttributes,
          };

          storage.setMasterKey(masterKey);
          await storage.storeCredentials(credentials);

          // [PERSISTENCE FIX] Store session token separately for cross-restart persistence
          await storage.storeSessionToken(token, values.email, response.id);

          const authContext = {
            userId: response.id,
            accountKey: `auth-${response.id}`,
            userAgent: "Raycast/Ente-Auth/1.0.0",
          };

          await storage.storeAuthenticationContext(authContext);

          apiClient.setToken(token);
          apiClient.setAuthenticationContext(authContext);

          toast.style = Toast.Style.Success;
          toast.title = "Login successful!";

          // CRITICAL FIX: Initialize authenticator service to trigger smart auto-sync
          try {
            const authenticatorService = getAuthenticatorService();
            await authenticatorService.init();

            // Try to get the decrypted authenticator key and store it
            await authenticatorService.getAuthCodes();

            // The authenticator key should now be cached in the service
          } catch {
            // Ignore errors during authenticator key caching
          }

          // Switch to codes view
          setIsLoggedIn(true);
          setShowLogin(false);
          await loadCodes(true); // forceLoad=true to bypass React state timing issue
        }
      }
    } catch (error) {
      console.error("Login error:", error);

      // Check if this is the specific passkey error we want to replace
      let message = error instanceof Error ? error.message : "An unknown error occurred";

      if (
        error instanceof Error &&
        (error.message.includes("Cannot read properties of undefined (reading 'kekSalt')") ||
          error.message.includes("kekSalt") ||
          error.message.includes("keyAttributes"))
      ) {
        message = "Passkey not supported, kindly disable and login and enable it back";
      }

      setLoginError(message);
      await showToast({
        style: Toast.Style.Failure,
        title: "Login failed",
        message: message,
      });
    } finally {
      setLoginLoading(false);
    }
  };

  // Initial login check (runs once on mount)
  useEffect(() => {
    checkLoginStatus();
  }, []); // Empty dependency array - only run once on mount

  // Timer setup for logged in users (separate effect)
  useEffect(() => {
    let countdownTimer: NodeJS.Timeout | null = null;
    let refreshTimer: NodeJS.Timeout | null = null;

    if (isLoggedIn) {
      // Refresh codes function (shared between timers)
      const refreshCodes = async () => {
        try {
          const authenticatorService = getAuthenticatorService();
          const authCodes = await authenticatorService.getAuthCodes();
          setCodes(authCodes);
        } catch (error) {
          console.error("Error refreshing codes:", error);
        }
      };

      // Update countdown and regenerate codes every second
      countdownTimer = setInterval(() => {
        setCodes((prevCodes) => {
          // Only update if we have codes and they need updating
          if (prevCodes.length === 0) return prevCodes;

          return prevCodes.map((code) => {
            if (code.type === "totp" || code.type === "steam") {
              const now = Date.now();
              const period = code.period * 1000; // Convert to milliseconds
              const timeInPeriod = now % period;
              const remainingMs = period - timeInPeriod;
              const remainingSeconds = Math.ceil(remainingMs / 1000);
              const progress = (remainingMs / period) * 100;

              // CRITICAL FIX: Generate new TOTP code every second to ensure it's always current
              const totpType = code.type === "steam" ? "steam" : "totp";
              const newCode = generateTOTP(code.secret, code.period, code.digits, code.algorithm, totpType);

              // Log when code actually changes (new period started)
              if (newCode !== code.code) {
                // Code updated for new TOTP period
              }

              // Always update with fresh values
              return {
                ...code,
                code: newCode,
                remainingSeconds,
                progress,
              };
            } else if (code.type === "hotp") {
              // HOTP codes don't change automatically
              return {
                ...code,
                code: "------", // HOTP placeholder
                remainingSeconds: undefined,
                progress: undefined,
              };
            }
            return code;
          });
        });
      }, 1000);

      // Initial refresh
      refreshCodes();

      // Set up periodic refresh (every 30 seconds as backup)
      refreshTimer = setInterval(refreshCodes, 30000);
    }

    return () => {
      if (countdownTimer) {
        clearInterval(countdownTimer);
      }
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    };
  }, [isLoggedIn]); // Only depend on isLoggedIn for timer setup

  // Show login form if not logged in
  if (showLogin && !isLoggedIn) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title={otpRequested ? "Login" : "Send Code"} onSubmit={handleLoginSubmit} />
          </ActionPanel>
        }
        isLoading={loginLoading}
      >
        <Form.TextField
          id="email"
          title="Email"
          placeholder="Enter your Ente email"
          error={loginError}
          onChange={() => setLoginError(undefined)}
          autoFocus
        />
        {otpRequested && (
          <>
            <Form.PasswordField id="password" title="Password" placeholder="Enter your Ente password" />
            {!useSRP && <Form.TextField id="otp" title="Verification Code" placeholder="Enter code from email" />}
          </>
        )}
        <Form.Description
          text={
            otpRequested
              ? useSRP
                ? "Enter your password to authenticate with SRP."
                : "Enter your password and the verification code sent to your email."
              : "We'll check your authentication method and guide you through login."
          }
        />
      </Form>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search authenticator codes..."
      onSearchTextChange={setSearchText}
      isShowingDetail
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadCodes} />
          <Action title="Sync with Server" icon={Icon.Download} onAction={syncCodes} />
          <Action title="Logout" icon={Icon.ExclamationMark} style={Action.Style.Destructive} onAction={handleLogout} />
        </ActionPanel>
      }
    >
      {filteredCodes.map((item) => {
        const progressColor = getProgressColor(item.progress || 0);
        const formattedCode = formatCode(item.code, item.digits);

        // Match web app display: Issuer as title, Account as subtitle (grey)
        const displayTitle = item.issuer || item.name;
        const displaySubtitle = item.issuer ? item.name : undefined;

        return (
          <List.Item
            key={item.id}
            title={displayTitle}
            subtitle={displaySubtitle}
            icon={getItemIcon(item, progressColor)}
            // accessories={[
            //   { text: formattedCode, tooltip: "Current OTP Code" }
            // ]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Issuer" text={item.issuer || "Unknown"} />
                    <List.Item.Detail.Metadata.Label title="Account" text={item.name} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Current Code" text={formattedCode} />
                    <List.Item.Detail.Metadata.TagList title="Type">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={item.type.toUpperCase()}
                        color={item.type === "totp" ? Color.Green : Color.Blue}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    {item.type === "totp" && item.remainingSeconds !== undefined && (
                      <List.Item.Detail.Metadata.Label title="Refreshes in" text={`${item.remainingSeconds} seconds`} />
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action title="Copy Code" icon={Icon.Clipboard} onAction={() => copyAndPasteCode(item.code)} />
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadCodes} />
                <Action title="Sync with Server" icon={Icon.Download} onAction={syncCodes} />
                <Action
                  title="Logout"
                  icon={Icon.ExclamationMark}
                  style={Action.Style.Destructive}
                  onAction={handleLogout}
                />
              </ActionPanel>
            }
          />
        );
      })}

      {filteredCodes.length === 0 && !isLoading && (
        <List.EmptyView
          title="No authentication codes found"
          description="Sync with the server or add a new authentication code."
          icon={Icon.Key}
        />
      )}
    </List>
  );
}

// Helper function to format the code with spaces for readability
function formatCode(code: string, digits: number): string {
  if (digits === 6) {
    return `${code.substring(0, 3)} ${code.substring(3)}`;
  } else if (digits === 8) {
    return `${code.substring(0, 4)} ${code.substring(4)}`;
  }
  return code;
}

// Helper function to determine progress color based on remaining time
function getProgressColor(progress: number): Color {
  if (progress > 66) {
    return Color.Green;
  } else if (progress > 33) {
    return Color.Yellow;
  }
  return Color.Red;
}

// Helper function to get the appropriate icon for an auth code
function getItemIcon(item: AuthCode, progressColor: Color): { source: string | Icon; tintColor?: Color } {
  // Since server doesn't provide actual icon data (iconSrc/iconID are empty),
  // we use issuer-based mapping for better visual recognition

  if (item.issuer) {
    const issuerLower = item.issuer.toLowerCase();

    // Map issuers to their official service icons/favicons
    const issuerIconMap: Record<string, string> = {
      // Authentication & Security Services
      google: "https://accounts.google.com/favicon.ico",
      microsoft: "https://www.microsoft.com/favicon.ico",
      apple: "https://appleid.apple.com/favicon.ico",
      github: "https://github.com/favicon.ico",
      gitlab: "https://gitlab.com/assets/favicon.ico",
      bitbucket: "https://bitbucket.org/favicon.ico",

      // Communication & Social
      discord: "https://discord.com/assets/favicon.ico",
      slack: "https://slack.com/favicon.ico",
      telegram: "https://telegram.org/favicon.ico",
      whatsapp: "https://web.whatsapp.com/favicon.ico",
      twitter: "https://abs.twimg.com/favicons/twitter.ico",
      facebook: "https://static.xx.fbcdn.net/rsrc.php/yo/r/iRmz9lCMBD2.ico",
      instagram: "https://static.cdninstagram.com/rsrc.php/v3/yz/r/VsNE-OHk_8a.ico",
      linkedin: "https://static.licdn.com/sc/h/al2o9zrvru7aqj8e1x2rzsrca",

      // Password Managers & Security
      bitwarden: "https://bitwarden.com/favicon.ico",
      "1password": "https://1password.com/favicon.ico",
      lastpass: "https://www.lastpass.com/favicon.ico",
      dashlane: "https://www.dashlane.com/favicon.ico",
      authy: "https://authy.com/favicon.ico",

      // Email & Productivity
      tutanota: "https://tutanota.com/favicon.ico",
      protonmail: "https://proton.me/favicon.ico",
      proton: "https://proton.me/favicon.ico",
      gmail: "https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico",
      outlook: "https://outlook.live.com/favicon.ico",

      // Cloud Storage
      dropbox: "https://cfl.dropboxstatic.com/static/images/favicon.ico",
      onedrive: "https://res.cdn.office.net/officehub/bundles/1.0.944/images/favicon.ico",
      icloud: "https://www.icloud.com/favicon.ico",

      // Gaming & Entertainment
      steam: "https://store.steampowered.com/favicon.ico",
      twitch: "https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png",
      nintendo: "https://accounts.nintendo.com/favicon.ico",
      playstation: "https://id.sonyentertainmentnetwork.com/favicon.ico",
      xbox: "https://login.live.com/favicon.ico",

      // Financial & Shopping
      amazon: "https://www.amazon.com/favicon.ico",
      paypal: "https://www.paypal.com/favicon.ico",
      stripe: "https://stripe.com/favicon.ico",
      coinbase: "https://coinbase.com/favicon.ico",

      // Development & Tools
      atlassian: "https://www.atlassian.com/favicon.ico",
      jira: "https://www.atlassian.com/favicon.ico",
      confluence: "https://www.atlassian.com/favicon.ico",
      notion: "https://www.notion.so/favicon.ico",
      figma: "https://static.figma.com/app/icon/1/favicon.ico",
    };

    // Try exact match first
    if (issuerIconMap[issuerLower]) {
      return { source: issuerIconMap[issuerLower] };
    }

    // Try partial matches for common cases
    for (const [key, iconUrl] of Object.entries(issuerIconMap)) {
      if (issuerLower.includes(key)) {
        return { source: iconUrl };
      }
    }
  }

  // Fallback to the default key icon with progress color for timing indication
  return { source: Icon.Key, tintColor: progressColor };
}
