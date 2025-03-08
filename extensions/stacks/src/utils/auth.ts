import { LocalStorage, showToast, Toast } from "@raycast/api";
import firebase from "firebase/compat/app";
import "firebase/compat/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC6DCBEzA8yVZtUQO7Mc687AOnyYhloRIU",
  projectId: "stacks-259313",
  databaseURL: "https://stacks-259313.firebaseio.com",
  authDomain: "stacks-259313.firebaseapp.com",
  storageBucket: "stacks-259313.appspot.com",
  messagingSenderId: "574408922411",
};

// Initialize Firebase if it hasn't been initialized yet
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Store keys for local storage
const FIREBASE_TOKEN_KEY = "firebase_token";
const FIREBASE_USER_KEY = "firebase_user";
const GQL_TOKEN_KEY = "gqlToken";
const USERNAME_KEY = "username";

// Function to manually set authentication tokens
// This can be used for development/testing
export async function setManualAuthTokens(idToken: string, username: string) {
  try {
    await LocalStorage.setItem(GQL_TOKEN_KEY, idToken);
    await LocalStorage.setItem(USERNAME_KEY, username);

    await showToast({
      style: Toast.Style.Success,
      title: "Authentication Successful",
      message: `Welcome, ${username}!`,
    });

    return true;
  } catch (error) {
    console.error("Error setting manual auth tokens:", error);
    throw error;
  }
}

// Function to check if user is authenticated
export async function isAuthenticated() {
  const token = await LocalStorage.getItem(GQL_TOKEN_KEY);
  return !!token;
}

// Function to get user info
export async function getUserInfo() {
  const username = await LocalStorage.getItem(USERNAME_KEY);
  return { username: username as string };
}

// Function to logout
export async function logout() {
  try {
    await LocalStorage.removeItem(FIREBASE_TOKEN_KEY);
    await LocalStorage.removeItem(FIREBASE_USER_KEY);
    await LocalStorage.removeItem(GQL_TOKEN_KEY);
    await LocalStorage.removeItem(USERNAME_KEY);
    await firebase.auth().signOut();
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
}
