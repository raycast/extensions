/**
 * Email handling module for 2FA code detection
 * Provides functionality to fetch and process 2FA codes from both Apple Mail and Gmail
 */

import { getPreferenceValues, List, Icon, Color } from "@raycast/api";
import { Message, Preferences, SearchType } from "./types";
import { calculateLookBackMinutes } from "./utils";
import { useState, useEffect, useCallback, useRef } from "react";
import { runAppleScript } from "@raycast/utils";
import { extractCode } from "./utils";
import { getGmailMessages, checkGmailAuth } from "./gmail";
import { ErrorView } from "./components/ErrorView";
import React from "react";

/**
 * Storage interface for managing email message state
 * Tracks processed messages to avoid duplicate processing
 */
interface MessageStorage {
  hasCode: Record<string, boolean>; // Maps message IDs to whether they contain codes
  latestTimestamp?: number; // Most recent message timestamp for incremental updates
}

/**
 * Fetches emails from Apple Mail using AppleScript
 * - Processes messages from the inbox
 * - Stops when reaching a known message ID or cutoff date
 * - Returns messages as delimited string for parsing
 */
async function getAppleMailMessages(
  searchType: SearchType,
  sinceDate?: Date,
  knownGuids: string[] = []
): Promise<Message[]> {
  const prefs = getPreferenceValues<Preferences>();
  const lookbackMinutes = calculateLookBackMinutes(prefs.lookBackUnit, parseInt(prefs.lookBackAmount || "1", 10));

  // Calculate seconds since epoch for our cutoff date
  const cutoffSeconds = sinceDate
    ? Math.floor(sinceDate.getTime() / 1000)
    : Math.floor(Date.now() / 1000) - lookbackMinutes * 60;

  // Convert known guids to AppleScript list
  const knownGuidsStr = knownGuids.map((guid) => `"${guid}"`).join(", ");

  const script = `
    tell application "Mail"
      try
        set inb to mailbox "INBOX" of first account
        set knownGuids to {${knownGuidsStr}}
        set cutoffDate to (current date) - ${Math.floor(Date.now() / 1000) - cutoffSeconds}
        set output to ""
        set messageCount to 0
        
        -- Get messages until we've hit a known one or reach cutoff
        repeat with i from 1 to 50
          try
            set m to message i of inb
            set msgId to id of m
            
            -- Exit if we've seen this message before
            if knownGuids contains msgId then
              exit repeat
            end if
            
            set msgDate to date received of m
            -- Exit if message is too old
            if msgDate < cutoffDate then
              exit repeat
            end if
            
            set msgSubject to subject of m
            set msgSender to sender of m
            set msgContent to content of m
            set msgDateStr to msgDate as «class isot» as string
            
            set messageCount to messageCount + 1
            set output to output & msgId & "$break" & msgSubject & "$break" & msgSender & "$break" & msgContent & "$break" & msgDateStr & "$end"
          end try
        end repeat
        
        return output
      end try
    end tell
  `;

  try {
    const result = await runAppleScript<string>(script, {
      humanReadableOutput: true,
      timeout: 10000,
    });

    if (!result) return [];

    return result
      .split("$end")
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const [guid, subject, sender, content, dateStr] = line.split("$break");
        return {
          guid,
          message_date: dateStr,
          sender,
          text: `${subject}\n${content}`,
          source: "email" as const,
        };
      });
  } catch (error) {
    console.error("Failed to get emails:", error);
    return [];
  }
}

/**
 * Options for email hook configuration
 */
interface UseEmailsOptions {
  searchText?: string; // Optional text to filter messages
  searchType: SearchType; // Type of search (all or code-only)
  enabled?: boolean; // Whether email source is enabled
}

/**
 * React hook for managing email messages and 2FA code detection
 * - Maintains cache of processed messages to avoid duplicates
 * - Uses incremental updates based on message timestamps
 * - Integrates with Raycast's search and filtering capabilities
 */
export function useEmails(options: UseEmailsOptions) {
  const preferences = getPreferenceValues<Preferences>();
  const emailSource = preferences.emailSource || "applemail";
  const storage = useRef<MessageStorage>({ hasCode: {} });
  const messageCache = useRef<Map<string, boolean>>(new Map());

  // UI and loading state management
  const [data, setData] = useState<Message[]>([]);
  const [permissionView, setPermissionView] = useState<JSX.Element | null>(null);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [isInitialLoadStarted, setIsInitialLoadStarted] = useState(false);
  const isLoadingRef = useRef(false);

  // Process new emails and update state, avoiding duplicates
  const processNewEmails = useCallback(
    (newEmails: Message[]) => {
      setData((prevData) => {
        const uniqueEmails = newEmails.filter((email) => {
          // Skip if already processed
          if (messageCache.current.has(email.guid)) {
            return false;
          }

          // For code-only search, check if message contains a code
          if (options.searchType === "code") {
            const code = extractCode(email.text);
            const hasCode = code !== null;
            messageCache.current.set(email.guid, hasCode);
            return hasCode;
          }

          messageCache.current.set(email.guid, true);
          return true;
        });

        return uniqueEmails.length > 0 ? [...prevData, ...uniqueEmails] : prevData;
      });
    },
    [options.searchType]
  );

  // Main email fetching logic with initial load and incremental update support
  const fetchEmails = useCallback(async () => {
    if (!options.enabled || isLoadingRef.current) {
      return;
    }

    try {
      isLoadingRef.current = true;

      // Determine time window: full window for initial load, incremental for updates
      let cutoffTime: Date;
      if (!isInitialLoadComplete) {
        const prefs = getPreferenceValues<Preferences>();
        const lookbackMinutes = calculateLookBackMinutes(prefs.lookBackUnit, parseInt(prefs.lookBackAmount || "1", 10));
        cutoffTime = new Date(Date.now() - lookbackMinutes * 60 * 1000);
      } else {
        // For updates, only look for messages newer than our latest known message
        cutoffTime = storage.current.latestTimestamp
          ? new Date(storage.current.latestTimestamp)
          : new Date(Date.now() - 60 * 1000); // Fallback to 1 minute if no timestamp
      }

      let emails: Message[] = [];

      // Fetch from selected email source (Gmail or Apple Mail)
      if (emailSource === "gmail") {
        if (!preferences.gmailClientId) {
          console.error("Gmail OAuth Client ID not configured");
          setData([]);
          setPermissionView(
            React.createElement(ErrorView, {
              icon: { source: Icon.ExclamationMark, tintColor: Color.Red },
              title: "Gmail Configuration Required",
              description: "Please add your Gmail OAuth Client ID in the extension preferences.",
            })
          );
          return;
        }

        try {
          const isAuthed = await checkGmailAuth();
          if (!isAuthed) {
            setData([]);
            setPermissionView(
              React.createElement(ErrorView, {
                icon: { source: Icon.Person, tintColor: Color.Blue },
                title: "Gmail Authorization Required",
                description: "Please authorize access to your Gmail account.",
              })
            );
            return;
          }
          emails = await getGmailMessages(options.searchType, cutoffTime);
        } catch (error) {
          console.error("Gmail error:", error);
          setData([]);
          setPermissionView(
            React.createElement(ErrorView, {
              icon: { source: Icon.ExclamationMark, tintColor: Color.Red },
              title: "Gmail Error",
              description: "Failed to fetch messages from Gmail. Please try again.",
            })
          );
          return;
        }
      } else {
        const knownGuids = Object.keys(storage.current.hasCode);
        emails = await getAppleMailMessages(options.searchType, cutoffTime, knownGuids);
      }

      setPermissionView(null);

      if (emails.length > 0) {
        processNewEmails(emails);

        // Track latest message timestamp for future incremental updates
        const latestEmail = emails.reduce((latest: number, email: Message) => {
          const emailDate = new Date(email.message_date).getTime();
          return emailDate > latest ? emailDate : latest;
        }, storage.current.latestTimestamp || 0);

        if (latestEmail > (storage.current.latestTimestamp || 0)) {
          storage.current.latestTimestamp = latestEmail;
        }
      }

      if (!isInitialLoadComplete) {
        setIsInitialLoadComplete(true);
      }
    } catch (error) {
      console.error("Failed to get emails:", error);
      if (!isInitialLoadComplete) {
        setIsInitialLoadComplete(true);
      }
    } finally {
      isLoadingRef.current = false;
    }
  }, [
    emailSource,
    options.searchType,
    options.enabled,
    processNewEmails,
    isInitialLoadComplete,
    preferences.gmailClientId,
  ]);

  // Reset state when search parameters change
  useEffect(() => {
    messageCache.current.clear();
    storage.current = { hasCode: {} };
    setData([]);
    setIsInitialLoadComplete(false);
    setIsInitialLoadStarted(false);
  }, [options.searchText, options.searchType]);

  // Start initial load when enabled
  useEffect(() => {
    if (!isInitialLoadStarted && options.enabled) {
      setIsInitialLoadStarted(true);
      fetchEmails();
    }
  }, [fetchEmails, options.enabled, isInitialLoadStarted]);

  // Set up polling for updates
  useEffect(() => {
    if (!options.enabled) {
      return;
    }

    const interval = setInterval(fetchEmails, 1000);
    return () => clearInterval(interval);
  }, [fetchEmails, options.enabled]);

  return {
    data,
    isLoading: !isInitialLoadComplete,
    permissionView,
    isInitialLoadComplete,
    revalidate: fetchEmails,
  };
}
