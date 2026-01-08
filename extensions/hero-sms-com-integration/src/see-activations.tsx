import React, { useState, useEffect, useRef } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Detail,
  getPreferenceValues,
  Clipboard,
  popToRoot,
  LocalStorage,
} from "@raycast/api";
import {
  getActiveActivations,
  getStatusV2,
  setActivationStatus,
  Activation,
  getServicesList,
  getCountries,
  getBalance,
} from "./api";
import { parsePhoneNumber, AsYouType, type CountryCode } from "libphonenumber-js";
import { getRemainingTimeFromLocal } from "./utils";

interface Preferences {
  apiKey: string;
}

interface StatusDetails {
  verificationType?: number;
  sms?: {
    dateTime: string;
    code: string;
    text: string;
  };
  call?: {
    from: string;
    text: string;
    code: string;
    dateTime: string;
    url: string;
    parsingCount: number;
  };
}

function parseBalance(balanceString: string): number {
  // Balance comes as "ACCESS_BALANCE:123.45"
  if (balanceString.startsWith("ACCESS_BALANCE:")) {
    const amount = balanceString.replace("ACCESS_BALANCE:", "");
    return parseFloat(amount) || 0;
  }
  return parseFloat(balanceString) || 0;
}

export default function SeeActivations() {
  const [activations, setActivations] = useState<
    (Activation & { statusDetails?: StatusDetails | null; localCreatedAt?: number })[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [servicesMap, setServicesMap] = useState<Record<string, string>>({});
  const [countriesMap, setCountriesMap] = useState<Record<string, string>>({});
  const [balance, setBalance] = useState<number | null>(null);

  const fetchActivations = async () => {
    try {
      const preferences = getPreferenceValues<Preferences>();
      if (!preferences.apiKey) {
        await showToast({
          style: Toast.Style.Failure,
          title: "API Key Required",
          message: "Please configure your API key in Raycast preferences",
        });
        return;
      }

      const activeActivations = await getActiveActivations();

      // Enhance each activation with status details and local timer data
      const enhancedActivations = await Promise.all(
        activeActivations.map(async (activation) => {
          try {
            const status = await getStatusV2(parseInt(activation.activationId));

            // Check if we have local storage data for this activation
            const activationKey = `activation_${activation.activationId}`;
            const localData = await LocalStorage.getItem(activationKey);
            let localCreatedAt: number | undefined = undefined;

            if (localData) {
              try {
                const parsed = JSON.parse(localData as string);
                localCreatedAt = parsed.createdAt;
              } catch {
                // Invalid data, ignore
              }
            }

            return {
              ...activation,
              statusDetails: status,
              localCreatedAt, // Use local timestamp if available
            };
          } catch {
            // Check for local storage even if status fetch fails
            const activationKey = `activation_${activation.activationId}`;
            const localData = await LocalStorage.getItem(activationKey);
            let localCreatedAt: number | undefined = undefined;

            if (localData) {
              try {
                const parsed = JSON.parse(localData as string);
                localCreatedAt = parsed.createdAt;
              } catch {
                // Invalid data, ignore
              }
            }

            return {
              ...activation,
              statusDetails: null,
              localCreatedAt,
            };
          }
        }),
      );

      // Filter out expired activations (20 minutes from local creation time)
      const now = Date.now();
      const validActivations = enhancedActivations.filter((activation) => {
        if (activation.localCreatedAt) {
          const timeElapsed = now - activation.localCreatedAt;
          const twentyMinutes = 20 * 60 * 1000;

          // If expired, remove from local storage and filter out
          if (timeElapsed > twentyMinutes) {
            LocalStorage.removeItem(`activation_${activation.activationId}`);
            return false; // Remove from list
          }
        }
        return true; // Keep in list
      });

      setActivations(validActivations);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      if (error instanceof Error && error.message !== "NO_ACTIVATIONS") {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch activations",
          message: error.message,
        });
      }
    }
  };

  useEffect(() => {
    // Fetch services and countries for name mapping
    async function fetchMappings() {
      try {
        const preferences = getPreferenceValues<Preferences>();
        if (!preferences.apiKey) {
          return;
        }

        // Fetch services with English names
        const services = await getServicesList(undefined, "en");
        const servicesMapData: Record<string, string> = {};
        services.forEach((service) => {
          servicesMapData[service.code] = service.name;
        });
        setServicesMap(servicesMapData);

        // Fetch countries and use English names
        const countries = await getCountries();
        const countriesMapData: Record<string, string> = {};
        countries.forEach((country) => {
          // Use English name, fallback to Russian if English is not available
          countriesMapData[String(country.id)] = country.eng || country.rus;
        });
        setCountriesMap(countriesMapData);
      } catch (error) {
        console.error("Failed to fetch services/countries mappings:", error);
        // Don't show error toast here as it's not critical for viewing activations
      }
    }

    async function fetchBalance() {
      try {
        const preferences = getPreferenceValues<Preferences>();
        if (!preferences.apiKey) {
          return;
        }
        const balanceString = await getBalance();
        const balanceAmount = parseBalance(balanceString);
        setBalance(balanceAmount);
      } catch (error) {
        console.error("Failed to fetch balance:", error);
        setBalance(null);
      }
    }

    fetchBalance();
    // Refresh balance every 30 seconds
    const balanceInterval = setInterval(fetchBalance, 30000);

    fetchMappings();
    fetchActivations();

    // Set up auto-refresh every second and update timer
    intervalRef.current = setInterval(() => {
      setCurrentTime(new Date());
      fetchActivations();
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (balanceInterval) {
        clearInterval(balanceInterval);
      }
    };
  }, []);

  const handleCopyCode = async (activation: Activation & { statusDetails?: StatusDetails | null }) => {
    const code = activation.smsCode || activation.statusDetails?.sms?.code;
    if (code) {
      // Remove brackets if present
      const cleanCode = code.replace(/\[|\]/g, "").trim();
      await Clipboard.copy(cleanCode);
      await showToast({
        style: Toast.Style.Success,
        title: "Code Copied",
        message: `Code: ${cleanCode}`,
      });
      // Close Raycast
      await popToRoot();
    }
  };

  const handleCancelActivation = async (activation: Activation & { statusDetails?: StatusDetails | null }) => {
    try {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Canceling activation...",
      });

      await setActivationStatus(parseInt(activation.activationId), 8);

      await toast.hide();
      await showToast({
        style: Toast.Style.Success,
        title: "Activation Canceled",
        message: "Money has been returned to your account",
      });

      // Refresh activations to remove the canceled one
      fetchActivations();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to cancel activation",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const getRemainingTime = (activationTime: string): { minutes: number; seconds: number; expired: boolean } => {
    try {
      if (!activationTime || activationTime.trim() === "") {
        return { minutes: 0, seconds: 0, expired: true };
      }

      // Parse the activation time from API format "YYYY-MM-DD HH:MM:SS"
      // The API returns dates in this format - try parsing as local time first (more common)
      let activationDate: Date;

      if (activationTime.includes("T")) {
        // Already in ISO format
        activationDate = new Date(activationTime);
      } else if (activationTime.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
        // Format: "YYYY-MM-DD HH:MM:SS" - try as local time first
        // Convert "2026-01-08 21:42:03" to "2026-01-08T21:42:03" (local time)
        activationDate = new Date(activationTime.replace(" ", "T"));

        // If parsing as local time gives a future date or weird result, try UTC
        // Check if the parsed date is more than 5 minutes in the future (likely timezone issue)
        const now = currentTime;
        const testElapsed = now.getTime() - activationDate.getTime();
        if (testElapsed < -300000 || testElapsed > 25 * 60 * 1000) {
          // Try as UTC instead
          const [datePart, timePart] = activationTime.split(" ");
          const utcDate = new Date(`${datePart}T${timePart}Z`);
          if (!isNaN(utcDate.getTime())) {
            const utcElapsed = now.getTime() - utcDate.getTime();
            // Use UTC if it gives a more reasonable result (between 0 and 25 minutes)
            if (utcElapsed >= -60000 && utcElapsed <= 25 * 60 * 1000) {
              activationDate = utcDate;
            }
          }
        }
      } else {
        activationDate = new Date(activationTime);
      }

      // Validate the parsed date
      if (isNaN(activationDate.getTime())) {
        console.error("Invalid activation date:", activationTime);
        return { minutes: 0, seconds: 0, expired: true };
      }

      const now = currentTime;

      // Calculate time elapsed since activation (in milliseconds)
      const timeElapsed = now.getTime() - activationDate.getTime();

      // If activation date is more than 1 minute in the future, something is wrong
      if (timeElapsed < -60000) {
        console.error(
          "Activation date is in the future:",
          activationTime,
          "parsed as:",
          activationDate.toISOString(),
          "now:",
          now.toISOString(),
        );
        return { minutes: 0, seconds: 0, expired: true };
      }

      // Total activation duration is 20 minutes (20 * 60 * 1000 ms)
      const totalDuration = 20 * 60 * 1000;

      // Calculate remaining time
      const remaining = totalDuration - timeElapsed;

      // Add a small buffer (5 seconds) to prevent showing expired prematurely
      // If time has expired (with buffer)
      if (remaining <= -5000) {
        return { minutes: 0, seconds: 0, expired: true };
      }

      // If remaining is negative but within buffer, show 0:00 but not expired yet
      if (remaining < 0) {
        return { minutes: 0, seconds: 0, expired: false };
      }

      // Calculate minutes and seconds from remaining milliseconds
      const totalSeconds = Math.floor(remaining / 1000);
      let minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      // Cap at 20 minutes (should never exceed, but safety check)
      if (minutes > 20) {
        minutes = 20;
      }

      // If somehow we calculated negative time, show 0 but don't mark as expired yet
      if (minutes < 0 || seconds < 0) {
        return { minutes: 0, seconds: 0, expired: false };
      }

      return { minutes, seconds, expired: false };
    } catch (error) {
      console.error("Error calculating remaining time:", error, "activationTime:", activationTime);
      return { minutes: 0, seconds: 0, expired: true };
    }
  };

  if (activations.length === 0 && !isLoading) {
    return (
      <Detail
        markdown={`






        # No Active Activations
        
        
        
        You don't have any active phone number activations at the moment.
        
        
        
        To get started, request a phone number for SMS activation using the **Get phone number** command.
        
        
        
        
        `}
      />
    );
  }

  const balanceDisplay = balance !== null ? `$${balance.toFixed(2)}` : "Loading...";

  return (
    <List isLoading={isLoading}>
      {balance !== null && <List.Section title={`💰 Balance: ${balanceDisplay}`} key="balance-section" />}
      {activations.map((activation) => {
        const code = activation.smsCode || activation.statusDetails?.sms?.code;
        // Check if code actually exists and is not null/empty
        const hasCode = Boolean(
          code &&
          code !== "null" &&
          code !== "undefined" &&
          typeof code === "string" &&
          code.trim().length > 0 &&
          !code.match(/^\[.*\]$/), // Not just brackets
        );
        const status = getStatusText(activation, hasCode);
        const formattedPhone = formatPhoneNumber(activation.phoneNumber, activation.countryCode);

        // Get full service name, fallback to code if not found
        const serviceName = servicesMap[activation.serviceCode] || activation.serviceCode.toUpperCase();

        // Get full country name in English, fallback to countryName or code
        const countryName = countriesMap[activation.countryCode] || activation.countryName || activation.countryCode;
        // Debug logging
        const localCreatedAt = activation.localCreatedAt;
        console.log(`[DEBUG] Rendering activation ${activation.activationId}:`, {
          localCreatedAt,
          localCreatedAtDate: localCreatedAt ? new Date(localCreatedAt).toISOString() : null,
          activationTime: activation.activationTime,
          now: Date.now(),
          nowDate: new Date().toISOString(),
        });

        // Use local storage timestamp if available, otherwise fall back to server timestamp
        const remainingTime = localCreatedAt
          ? getRemainingTimeFromLocal(localCreatedAt)
          : getRemainingTime(activation.activationTime);

        console.log(`[DEBUG] Activation ${activation.activationId} remaining time:`, {
          usedLocalStorage: !!localCreatedAt,
          remainingTime,
          minutes: remainingTime.minutes,
          seconds: remainingTime.seconds,
          expired: remainingTime.expired,
        });
        const timeDisplay = remainingTime.expired
          ? "Expired"
          : `${remainingTime.minutes}:${remainingTime.seconds.toString().padStart(2, "0")}`;

        return (
          <List.Item
            key={activation.activationId}
            id={activation.activationId}
            title={formattedPhone}
            subtitle={`${serviceName} - ${countryName}`}
            accessories={[
              {
                text: `$${activation.activationCost.toFixed(2)}`,
              },
              {
                text: timeDisplay,
                icon: remainingTime.expired ? Icon.XMarkCircle : Icon.Clock,
                tooltip: remainingTime.expired ? "Activation expired" : `Time remaining: ${timeDisplay}`,
              },
              {
                text: status,
                icon: hasCode ? Icon.Checkmark : Icon.Clock,
              },
            ]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Activation ID" text={activation.activationId} />
                    <List.Item.Detail.Metadata.Label title="Phone Number" text={formattedPhone} />
                    <List.Item.Detail.Metadata.Label title="Service" text={serviceName} />
                    <List.Item.Detail.Metadata.Label title="Country" text={countryName} />
                    <List.Item.Detail.Metadata.Label title="Cost" text={`$${activation.activationCost.toFixed(2)}`} />
                    <List.Item.Detail.Metadata.Label title="Status" text={getStatusText(activation, hasCode)} />
                    <List.Item.Detail.Metadata.Label
                      title="Time Remaining"
                      text={remainingTime.expired ? "Expired" : `${remainingTime.minutes}m ${remainingTime.seconds}s`}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    {hasCode && code && (
                      <>
                        <List.Item.Detail.Metadata.Label title="SMS Code" text={code.replace(/\[|\]/g, "").trim()} />
                        {activation.statusDetails?.sms?.text && (
                          <List.Item.Detail.Metadata.Label title="SMS Text" text={activation.statusDetails.sms.text} />
                        )}
                      </>
                    )}
                    {activation.activationTime && (
                      <List.Item.Detail.Metadata.Label title="Activation Time" text={activation.activationTime} />
                    )}
                    {activation.canGetAnotherSms === "1" && (
                      <List.Item.Detail.Metadata.Label title="Can Get Another SMS" text="Yes" />
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                {hasCode && (
                  <>
                    <Action
                      title="Copy Code and Close"
                      icon={Icon.Clipboard}
                      shortcut={{ modifiers: [], key: "enter" }}
                      onAction={() => handleCopyCode(activation)}
                    />
                    <Action
                      title="Copy to Clipboard"
                      icon={Icon.Clipboard}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                      onAction={async () => {
                        const code = activation.smsCode || activation.statusDetails?.sms?.code;
                        if (code) {
                          const cleanCode = code.replace(/\[|\]/g, "").trim();
                          await Clipboard.copy(cleanCode);
                          await showToast({
                            style: Toast.Style.Success,
                            title: "Code Copied",
                            message: `Code: ${cleanCode}`,
                          });
                        }
                      }}
                    />
                  </>
                )}
                <Action
                  title="Copy Phone Number"
                  icon={Icon.Phone}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                  onAction={async () => {
                    await Clipboard.copy(formattedPhone);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Phone Number Copied",
                      message: formattedPhone,
                    });
                  }}
                />
                {!hasCode && (
                  <>
                    <Action
                      title="Cancel Activation"
                      icon={Icon.XMarkCircle}
                      shortcut={{ modifiers: ["cmd"], key: "k" }}
                      style={Action.Style.Destructive}
                      onAction={() => handleCancelActivation(activation)}
                    />
                    <Action
                      title="Copy Code When Available"
                      icon={Icon.Clipboard}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                      onAction={async () => {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "No Code Yet",
                          message: "SMS code has not been received yet",
                        });
                      }}
                    />
                  </>
                )}
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={fetchActivations}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function formatPhoneNumber(phoneNumber: string, countryCode?: string): string {
  try {
    // Clean the phone number (remove any non-digit characters except +)
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, "");

    // Try to parse with country code if available
    if (countryCode) {
      // Map numeric country codes to ISO codes (common ones)
      // Note: Both Russia (RU) and Kazakhstan (KZ) use +7, defaulting to RU
      // Country code "187" might be a custom ID from hero-sms.com API
      const countryCodeMap: Record<string, string> = {
        "1": "US",
        "7": "RU", // Also used by Kazakhstan
        "44": "GB",
        "49": "DE",
        "33": "FR",
        "39": "IT",
        "34": "ES",
        "86": "CN",
        "81": "JP",
        "82": "KR",
        "91": "IN",
        "62": "ID",
        "60": "MY",
        "63": "PH",
        "84": "VN",
        "380": "UA",
        "254": "KE",
        "255": "TZ",
        "852": "HK",
        "48": "PL",
        "972": "IL",
        "996": "KG",
        "187": "US", // Likely USA virtual numbers
      };

      const isoCode = countryCodeMap[countryCode];
      if (isoCode) {
        try {
          // If number doesn't start with +, try parsing with country code
          const numberToParse = cleanNumber.startsWith("+") ? cleanNumber : `+${cleanNumber}`;
          const phone = parsePhoneNumber(numberToParse, isoCode as CountryCode);
          if (phone && phone.isValid()) {
            return phone.formatInternational();
          }
        } catch {
          // Fall through to AsYouType formatter
        }
      }
    }

    // Fallback: Try parsing without country code (might already include country code)
    try {
      const numberToParse = cleanNumber.startsWith("+") ? cleanNumber : `+${cleanNumber}`;
      const phone = parsePhoneNumber(numberToParse);
      if (phone && phone.isValid()) {
        return phone.formatInternational();
      }
    } catch {
      // Continue to AsYouType
    }

    // Last resort: Use AsYouType formatter for basic formatting
    const formatter = new AsYouType();
    const formatted = formatter.input(cleanNumber);
    return formatted || phoneNumber;
  } catch {
    return phoneNumber;
  }
}

function getStatusText(activation: Activation, hasCode: boolean): string {
  // Only show "Code Received" if we actually have a code
  if (hasCode) {
    return "Code Received";
  }

  // Status meanings from API docs:
  // 1 - SMS sent (waiting for code)
  // 3 - Request resending of SMS
  // 4 - Activation ready/waiting (when no code yet, still waiting for SMS)
  // 6 - Complete activation (code received and confirmed)
  // 8 - Cancel activation

  switch (activation.activationStatus) {
    case "1":
      return "Waiting for SMS";
    case "3":
      return "Retrying";
    case "4":
      // Status 4 without code means still waiting for SMS, not complete
      return "Waiting for SMS";
    case "6":
      return hasCode ? "Code Received" : "Completed";
    case "8":
      return "Canceled";
    default:
      return `Status: ${activation.activationStatus}`;
  }
}
