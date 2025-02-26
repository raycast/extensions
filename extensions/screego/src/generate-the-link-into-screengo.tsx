import { open, Detail, popToRoot } from "@raycast/api";
import { useEffect, useRef } from "react";
import * as crypto from "crypto";

export default function Command() {
  // Use a ref to track if we've already opened the URL
  const hasOpenedRef = useRef(false);

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
  const url = `https://screego.mevsec.com/?room=${roomId}&create=true`;

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

  return <Detail markdown="Opening Screego..." />;
}
