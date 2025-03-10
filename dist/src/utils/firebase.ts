import { LocalStorage } from "@raycast/api";
import * as admin from "firebase-admin";

const FIREBASE_SERVICE_ACCOUNT_KEY = "firebase_service_account";

interface FirebaseServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

let app: admin.app.App | undefined;

/**
 * Validates the Firebase service account JSON
 */
export function validateServiceAccount(serviceAccountJson: string): FirebaseServiceAccount | null {
  try {
    const serviceAccount = JSON.parse(serviceAccountJson) as FirebaseServiceAccount;
    
    // Check for required fields
    const requiredFields = [
      "project_id",
      "private_key",
      "client_email",
    ];
    
    for (const field of requiredFields) {
      if (!serviceAccount[field as keyof FirebaseServiceAccount]) {
        return null;
      }
    }
    
    return serviceAccount;
  } catch (error) {
    return null;
  }
}

/**
 * Saves the Firebase service account to local storage
 */
export async function saveServiceAccount(serviceAccountJson: string): Promise<boolean> {
  try {
    const serviceAccount = validateServiceAccount(serviceAccountJson);
    if (!serviceAccount) {
      return false;
    }
    
    await LocalStorage.setItem(FIREBASE_SERVICE_ACCOUNT_KEY, serviceAccountJson);
    
    // Reset the app instance to force reinitialization with new credentials
    if (app) {
      await app.delete();
      app = undefined;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Retrieves the Firebase service account from local storage
 */
export async function getServiceAccount(): Promise<FirebaseServiceAccount | null> {
  try {
    const serviceAccountJson = await LocalStorage.getItem<string>(FIREBASE_SERVICE_ACCOUNT_KEY);
    if (!serviceAccountJson) {
      return null;
    }
    
    return validateServiceAccount(serviceAccountJson);
  } catch (error) {
    return null;
  }
}

/**
 * Checks if the Firebase service account is configured
 */
export async function isServiceAccountConfigured(): Promise<boolean> {
  const serviceAccount = await getServiceAccount();
  return serviceAccount !== null;
}

/**
 * Resets the Firebase service account configuration
 */
export async function resetServiceAccount(): Promise<void> {
  await LocalStorage.removeItem(FIREBASE_SERVICE_ACCOUNT_KEY);
  if (app) {
    await app.delete();
    app = undefined;
  }
}

/**
 * Initializes the Firebase Admin SDK with the service account
 */
export async function initializeFirebase(): Promise<admin.app.App | null> {
  if (app) {
    return app;
  }
  
  const serviceAccount = await getServiceAccount();
  if (!serviceAccount) {
    return null;
  }
  
  try {
    // Check if any Firebase app already exists
    try {
      app = admin.app();
      return app;
    } catch (error) {
      // No app exists, initialize a new one
      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      });
      return app;
    }
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
    return null;
  }
}

/**
 * Gets the Firestore instance
 */
export async function getFirestore(): Promise<admin.firestore.Firestore | null> {
  const app = await initializeFirebase();
  if (!app) {
    return null;
  }
  
  return app.firestore();
} 