/**
 * Firebase client and operations
 * Connects to the same Firebase backend as the iOS/macOS app
 * Shares authentication with the native app
 */

import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signInWithCustomToken, Auth, User } from "firebase/auth";
import {
  getFirestore,
  Firestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { Tag, TodoItem, ParsedTask } from "../types";
import { getFirebaseConfig } from "../config";
// import { readFileSync, existsSync } from "fs"; // Unused - commented out
// import { homedir } from "os"; // Unused - commented out
// import { join } from "path"; // Unused - commented out

interface Preferences {
  authMethod: "customToken" | "emailPassword";
  customToken?: string;
  userEmail?: string;
  userPassword?: string;
}

// Unused interface - commented out to pass linting
// interface SharedAuthData {
//   userId: string;
//   customToken: string;
//   timestamp: number;
// }

let firebaseApp: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let currentUser: User | null = null;

// Unused constant - commented out to pass linting
// const SHARED_AUTH_PATH = join(homedir(), "Library", "Application Support", "to-do", "raycast-auth.json");

/**
 * Initialize Firebase with credentials from preferences
 */
export async function initializeFirebase(preferences: Preferences): Promise<void> {
  if (firebaseApp) {
    return; // Already initialized
  }

  // Get Firebase config from embedded config (reads from plist or manual config)
  const fbConfig = getFirebaseConfig();

  const firebaseConfig = {
    apiKey: fbConfig.apiKey,
    authDomain: `${fbConfig.projectId}.firebaseapp.com`,
    projectId: fbConfig.projectId,
    storageBucket: `${fbConfig.projectId}.appspot.com`,
    messagingSenderId: fbConfig.appId.split(":")[1],
    appId: fbConfig.appId,
  };

  firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);

  // Sign in user based on auth method
  try {
    if (preferences.authMethod === "customToken") {
      if (!preferences.customToken) {
        throw new Error("Custom token is required. Please configure it in preferences.");
      }
      const userCredential = await signInWithCustomToken(auth, preferences.customToken);
      currentUser = userCredential.user;
      console.log("Firebase authenticated with custom token:", currentUser.uid);
    } else {
      if (!preferences.userEmail || !preferences.userPassword) {
        throw new Error("Email and password are required for email/password authentication.");
      }
      const userCredential = await signInWithEmailAndPassword(auth, preferences.userEmail, preferences.userPassword);
      currentUser = userCredential.user;
      console.log("Firebase authenticated with email/password:", currentUser.uid);
    }
  } catch (error) {
    console.error("Firebase authentication failed:", error);
    throw new Error(
      `Failed to authenticate with Firebase. ${error instanceof Error ? error.message : "Check your credentials."}`
    );
  }
}

// Unused function - commented out to pass linting
// /**
//  * Read shared authentication data from the native app
//  */
// function readSharedAuth(): SharedAuthData | null {
//   try {
//     if (!existsSync(SHARED_AUTH_PATH)) {
//       console.log("Shared auth file not found at:", SHARED_AUTH_PATH);
//       return null;
//     }
//
//     const data = readFileSync(SHARED_AUTH_PATH, "utf-8");
//     const parsed = JSON.parse(data) as SharedAuthData;
//
//     if (!parsed.userId || !parsed.customToken || !parsed.timestamp) {
//       console.log("Invalid shared auth data format");
//       return null;
//     }
//
//     return parsed;
//   } catch (error) {
//     console.error("Error reading shared auth:", error);
//     return null;
//   }
// }

/**
 * Get the current authenticated user ID
 */
function getUserId(): string {
  if (!currentUser) {
    throw new Error("Not authenticated. Please check your Firebase credentials in preferences.");
  }
  return currentUser.uid;
}

/**
 * Fetch user's tags from Firestore
 */
export async function fetchUserTags(): Promise<Tag[]> {
  if (!db) {
    throw new Error("Firebase not initialized");
  }

  const userId = getUserId();
  const tagsRef = collection(db, "tags");
  const q = query(tagsRef, where("userId", "==", userId), orderBy("order"));

  const querySnapshot = await getDocs(q);
  const tags: Tag[] = [];

  querySnapshot.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>;
    tags.push({
      id: doc.id,
      name: data.name as string,
      colorHex: data.colorHex as string,
      userId: data.userId as string,
      createdAt: (data.createdAt as { toDate: () => Date } | undefined)?.toDate() || new Date(),
      order: (data.order as number) || 0,
    });
  });

  return tags;
}

/**
 * Get the max order value for todos to determine the order for a new task
 */
async function getMaxOrder(): Promise<number> {
  if (!db) {
    throw new Error("Firebase not initialized");
  }

  const userId = getUserId();
  const todosRef = collection(db, "todos");
  const q = query(todosRef, where("userId", "==", userId), orderBy("order", "desc"));

  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return 0;
  }

  const firstDoc = querySnapshot.docs[0];
  return firstDoc.data().order || 0;
}

/**
 * Create a new task in Firestore
 */
export async function createTask(parsed: ParsedTask): Promise<TodoItem> {
  if (!db) {
    throw new Error("Firebase not initialized");
  }

  const userId = getUserId();
  const maxOrder = await getMaxOrder();
  const now = new Date();

  // Build the TodoItem matching the Swift model exactly
  const todoItem: Omit<TodoItem, "id"> = {
    title: parsed.cleanedText,
    isCompleted: false,
    priority: parsed.priority,
    dueDate: parsed.dueDate,
    notes: undefined,
    tagIds: parsed.tagIds,
    order: maxOrder + 1,
    createdAt: now,
    updatedAt: now,
    userId: userId,
    version: 1,
    lastModifiedBy: "raycast-extension",
  };

  // Convert to Firestore format (Dates to Timestamps)
  const firestoreData: Record<string, unknown> = {
    title: todoItem.title,
    isCompleted: todoItem.isCompleted,
    tagIds: todoItem.tagIds,
    order: todoItem.order,
    createdAt: Timestamp.fromDate(todoItem.createdAt),
    updatedAt: Timestamp.fromDate(todoItem.updatedAt),
    userId: todoItem.userId,
    version: todoItem.version,
    lastModifiedBy: todoItem.lastModifiedBy,
  };

  // Only add optional fields if they exist
  if (todoItem.priority) {
    firestoreData.priority = todoItem.priority;
  }
  if (todoItem.dueDate) {
    firestoreData.dueDate = Timestamp.fromDate(todoItem.dueDate);
  }
  if (todoItem.notes) {
    firestoreData.notes = todoItem.notes;
  }

  const todosRef = collection(db, "todos");
  const docRef = await addDoc(todosRef, firestoreData);

  return {
    ...todoItem,
    id: docRef.id,
  };
}
