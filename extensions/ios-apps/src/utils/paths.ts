import { homedir } from "os";
import { existsSync, accessSync, constants, mkdirSync } from "fs";
import { getPreferenceValues } from "@raycast/api";
import { ExtensionPreferences } from "../types";

// Get preferences
export const preferences = getPreferenceValues<ExtensionPreferences>();

// Define the path to ipatool, using the preference if available
export const IPATOOL_PATH =
  preferences.ipatoolPath || (process.arch === "arm64" ? "/opt/homebrew/bin/ipatool" : "/usr/local/bin/ipatool");

// Get the downloads directory path from preferences or default to ~/Downloads
export function getDownloadsDirectory(): string {
  let downloadPath: string;
  
  if (preferences.downloadPath) {
    // Security check for directory traversal
    if (preferences.downloadPath.includes("..")) {
      throw new Error("Download path cannot contain directory traversal sequences");
    }
    
    // Replace ~ with the actual home directory if present
    downloadPath = preferences.downloadPath.startsWith("~") 
      ? preferences.downloadPath.replace("~", homedir())
      : preferences.downloadPath;
  } else {
    downloadPath = `${homedir()}/Downloads`;
  }

  // Create directory if it doesn't exist, then validate writability
  try {
    if (!existsSync(downloadPath)) {
      mkdirSync(downloadPath, { recursive: true });
    }
    accessSync(downloadPath, constants.W_OK);
    return downloadPath;
  } catch (error) {
    throw new Error(`Download directory ${downloadPath} is not accessible or writable: ${error}`);
  }
}

// Format price to display "Free" instead of "0" with proper currency symbol
export function formatPrice(price: string, currency?: string): string {
  if (price === "0") return "Free";

  // Get the appropriate currency symbol based on the currency code
  let symbol = "$"; // Default to USD
  if (currency) {
    switch (currency) {
      case "USD":
        symbol = "$";
        break;
      case "EUR":
        symbol = "€";
        break;
      case "GBP":
        symbol = "£";
        break;
      case "JPY":
        symbol = "¥";
        break;
      case "AUD":
        symbol = "A$";
        break;
      case "CAD":
        symbol = "C$";
        break;
      case "CNY":
        symbol = "¥";
        break;
      case "INR":
        symbol = "₹";
        break;
      case "RUB":
        symbol = "₽";
        break;
      case "KRW":
        symbol = "₩";
        break;
      case "BRL":
        symbol = "R$";
        break;
      case "MXN":
        symbol = "Mex$";
        break;
      // Add more currency codes as needed
      default:
        symbol = currency; // Use the currency code if no symbol is defined
    }
  }

  return `${symbol}${price}`;
}
