import { useState } from "react";
import { ActionPanel, Form, Action, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const API_URL = "https://v6.exchangerate-api.com/v6/af3569c5a79dadaccac752d0/latest/";
const CACHE_FILE_PATH = path.resolve(__dirname, "exchange_rate_cache.json");

interface ExchangeRateResponse {
  conversion_rates: {
    PEN: number;
    USD: number;
    [key: string]: number;
  };
}

interface CacheData {
  date: string; // Date in ISO format
  conversion_rates: {
    PEN: number;
    USD: number;
  };
  timestamp: string; // Date and time when the cache was saved
}

// Function to check if the cached data is valid (i.e., from today)
function isCacheValid(cacheDate: string): boolean {
  const today = new Date().toISOString().split("T")[0]; // Format YYYY-MM-DD
  return cacheDate === today;
}

// Function to load cached data if it exists and is valid
function loadCache(): CacheData | null {
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const cacheData: CacheData = JSON.parse(fs.readFileSync(CACHE_FILE_PATH, "utf-8"));
      if (isCacheValid(cacheData.date)) {
        console.log("Using cached data");
        return cacheData;
      } else {
        console.log("Cached data is outdated. A new request will be made.");
      }
    } else {
      console.log("No cache file found. A new request will be made.");
    }
  } catch (error) {
    console.error("Error loading cache:", error);
  }
  return null;
}

// Function to save data to cache with the current timestamp
function saveCache(conversion_rates: { PEN: number; USD: number }) {
  const cacheData: CacheData = {
    date: new Date().toISOString().split("T")[0],
    conversion_rates,
    timestamp: new Date().toISOString(), // Store timestamp in ISO format
  };
  fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(cacheData));
  console.log("Exchange rate data saved to cache");
}

// Function to clear cache by deleting the file
function clearCache() {
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      fs.unlinkSync(CACHE_FILE_PATH);
      showToast(Toast.Style.Success, "Cache cleared", "The cache file has been deleted.");
      console.log("Cache file deleted.");
    } else {
      showToast(Toast.Style.Failure, "No cache found", "There is no cache file to delete.");
      console.log("No cache file to delete.");
    }
  } catch (error) {
    showToast(Toast.Style.Failure, "Error clearing cache", "An error occurred while deleting the cache file.");
    console.error("Error deleting cache file:", error);
  }
}

// Function to fetch the exchange rate (checking cache first)
async function fetchExchangeRate(baseCurrency: string): Promise<{ rate: number; timestamp: string } | null> {
  // Load cached data if valid
  const cachedData = loadCache();
  if (cachedData) {
    const rate = baseCurrency === "USD" ? cachedData.conversion_rates.PEN : 1 / cachedData.conversion_rates.PEN;
    return {
      rate,
      timestamp: cachedData.timestamp,
    };
  }

  // If no valid cached data, make a request to the API
  try {
    console.log("Making API request to get the exchange rate");
    const response = await fetch(`${API_URL}${baseCurrency}`);
    const data = (await response.json()) as ExchangeRateResponse;

    // Save results to cache
    saveCache(data.conversion_rates);

    // Calculate the correct rate based on the base currency
    const rate = baseCurrency === "USD" ? data.conversion_rates.PEN : 1 / data.conversion_rates.PEN;
    
    return {
      rate,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    showToast(Toast.Style.Failure, "Conversion error", "An error occurred while fetching the exchange rate.");
    console.error(error);
    return null;
  }
}


// Main component
export default function Command() {
  const [amount, setAmount] = useState<string>(""); // Keep amount as string for input manipulation
  const [conversionType, setConversionType] = useState<string>("USD_TO_PEN");
  const [convertedAmount, setConvertedAmount] = useState<string | null>(null); // Store converted amount as a string
  const [conversionTimestamp, setConversionTimestamp] = useState<string | null>(null); // Store conversion timestamp

  async function handleConvert() {
    const numericAmount = parseAmount(amount);
    if (numericAmount === undefined || numericAmount <= 0) {
      showToast(Toast.Style.Failure, "Invalid amount", "Please enter a valid amount.");
      setConvertedAmount(null);
      setConversionTimestamp(null);
      return;
    }

    // Show loading toast with animated style
    const loadingToast = await showToast(Toast.Style.Animated, "Converting...", "Calculating the conversion amount");

    const baseCurrency = conversionType === "USD_TO_PEN" ? "USD" : "PEN";
    const exchangeData = await fetchExchangeRate(baseCurrency);
    if (exchangeData === null) {
      setConvertedAmount(null);
      setConversionTimestamp(null);
      loadingToast.style = Toast.Style.Failure;
      loadingToast.title = "Conversion error";
      loadingToast.message = "An error occurred while fetching the exchange rate.";
      return;
    }

    const result = (numericAmount * exchangeData.rate).toFixed(2);
    const formattedResult = Number(result).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const fromCurrency = conversionType === "USD_TO_PEN" ? "USD" : "PEN";
    const toCurrency = conversionType === "USD_TO_PEN" ? "PEN" : "USD";

    setConvertedAmount(`${numericAmount.toLocaleString("en-US")} ${fromCurrency} is ${formattedResult} ${toCurrency}`);

    // Format timestamp to "DIA/MES/AÑO HORA:MINUTOS:SEGUNDOS"
    const formattedTimestamp = new Date(exchangeData.timestamp).toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setConversionTimestamp(`Last checked: ${formattedTimestamp}`);

    // Update the toast to show success without the conversion message
    loadingToast.style = Toast.Style.Success;
    loadingToast.title = "Conversion successful";
    loadingToast.message = ""; // Leave message empty for a cleaner toast
  }

  function handleAmountChange(value: string) {
    // Only allow numbers, commas, and periods
    const sanitizedValue = value.replace(/[^0-9.,]/g, "");
    setAmount(sanitizedValue);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Convert currency" onAction={handleConvert} />
          <Action title="Clear cache" onAction={clearCache} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="conversionType" title="Conversion Type" value={conversionType} onChange={setConversionType}>
        <Form.Dropdown.Item value="USD_TO_PEN" title="USD to PEN" />
        <Form.Dropdown.Item value="PEN_TO_USD" title="PEN to USD" />
      </Form.Dropdown>

      <Form.TextField
        id="amount"
        title="Amount"
        placeholder="1,000"
        onChange={handleAmountChange} // Call the handler to sanitize input
        value={amount}
        autoFocus // Automatically focus this field when the extension opens
      />

      {convertedAmount && (
        <Form.Description text={convertedAmount} /> // Display the conversion result
      )}
      {conversionTimestamp && (
        <Form.Description text={conversionTimestamp} /> // Display the timestamp
      )}
    </Form>
  );
}

// Function to parse the amount field value to a number
function parseAmount(value: string): number | undefined {
  // Remove commas and validate the format
  const sanitizedValue = value.replace(/,/g, "");
  const numericValue = parseFloat(sanitizedValue);
  return isNaN(numericValue) ? undefined : numericValue;
}
