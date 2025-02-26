import { open, Detail, popToRoot, getPreferenceValues } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import * as crypto from "crypto";

// Define the preferences interface
interface Preferences {
  serverUrl?: string;
}

export default function Command() {
  // Use a ref to track if we've already opened the URL
  const hasOpenedRef = useRef(false);
  // Get preferences
  const preferences = getPreferenceValues<Preferences>();
  // Default server URL or use the one from preferences
  console.log("preferences", preferences);
  const serverUrl = preferences.serverUrl;

  // State to show in the UI
  const [markdown] = useState("Opening Screego...");

  // Generate a random password-like string for the room ID
  const generateRandomString = (length: number) => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";

    // Use Node.js crypto module to generate random bytes
    const randomBytes = crypto.randomBytes(length);

    // Use those random bytes to select characters from the charset
    for (let i = 0; i < length; i++) {
      result += charset[randomBytes[i] % charset.length];
    }

    return result;
  };

  // Generate a 16-character random string
  const roomId = generateRandomString(16);
  const url = `${serverUrl}/?room=${roomId}&create=true`;

  // Open the URL and then return to Raycast menu
  useEffect(() => {
    const openAndReturn = async () => {
      // Only open the URL if we haven't already
      if (!hasOpenedRef.current) {
        hasOpenedRef.current = true;
        await open(url);
        await popToRoot();
      }
    };

    openAndReturn();
  }, []);

  return <Detail markdown={markdown} />;
}
