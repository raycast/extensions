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

    if (!result) {
      return [];
    }

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
  const [data, setData] = useState<Message[]>([]);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [permissionView, setPermissionView] = useState<React.ReactElement | null>(null);

  // Simple cache to track processed messages
  const messageCache = useRef<Set<string>>(new Set());
  const isLoadingRef = useRef(false);
  const latestTimestamp = useRef<number>(0);

  // Process new emails and update state
  const processNewEmails = useCallback(
    (newEmails: Message[]) => {
      const uniqueEmails = newEmails.filter((email) => {
        // Skip if we've already processed this message
        if (messageCache.current.has(email.guid)) {
          return false;
        }

        // Mark as processed
        messageCache.current.add(email.guid);

        // Check for code
        const code = extractCode(email.text);
        const hasCode = code !== null;

        // For code-only search, only include messages with codes
        if (options.searchType === "code") {
          return hasCode;
        }

        return true;
      });

      if (uniqueEmails.length > 0) {
        setData((prevData) => {
          // Create a Set of existing IDs for O(1) lookup
          const existingIds = new Set(prevData.map((msg) => msg.guid));
          // Only add messages that aren't already in the list
          const newMessages = uniqueEmails.filter((msg) => !existingIds.has(msg.guid));
          return [...newMessages, ...prevData];
        });
      }
    },
    [options.searchType]
  );

  // Main email fetching logic
  const fetchEmails = useCallback(
    async (isInitialFetch = false) => {
      if (!options.enabled || isLoadingRef.current) {
        return;
      }

      try {
        isLoadingRef.current = true;

        // Calculate time window
        let cutoffTime: Date;
        if (isInitialFetch) {
          // On initial load, clear the cache
          messageCache.current.clear();
          latestTimestamp.current = 0;

          const prefs = getPreferenceValues<Preferences>();
          const lookbackMinutes = calculateLookBackMinutes(
            prefs.lookBackUnit,
            parseInt(prefs.lookBackAmount || "1", 10)
          );
          cutoffTime = new Date(Date.now() - lookbackMinutes * 60 * 1000);
        } else {
          // For updates, only look for messages newer than our latest
          cutoffTime = new Date(latestTimestamp.current || Date.now() - 60 * 1000);
        }

        let emails: Message[] = [];
        if (emailSource === "gmail") {
          if (!preferences.gmailClientId) {
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
          emails = await getAppleMailMessages(options.searchType, cutoffTime, Array.from(messageCache.current));
        }

        processNewEmails(emails);

        if (emails.length > 0) {
          // Update latest timestamp
          const latestEmail = Math.max(...emails.map((email) => new Date(email.message_date).getTime()));
          if (latestEmail > latestTimestamp.current) {
            latestTimestamp.current = latestEmail;
          }
        }

        if (isInitialFetch) {
          setIsInitialLoadComplete(true);
        }
      } catch (error) {
        if (!isInitialLoadComplete) {
          setIsInitialLoadComplete(true);
        }
      } finally {
        isLoadingRef.current = false;
      }
    },
    [options.enabled, options.searchType, processNewEmails, emailSource]
  );

  // Initial load
  useEffect(() => {
    if (!isInitialLoadComplete && options.enabled) {
      fetchEmails(true);
    }
  }, [fetchEmails, options.enabled, isInitialLoadComplete]);

  // Reset state when search parameters change
  useEffect(() => {
    setIsInitialLoadComplete(false);
  }, [options.searchText, options.searchType]);

  // Set up polling for updates
  useEffect(() => {
    if (!options.enabled || !isInitialLoadComplete) {
      return;
    }

    const interval = setInterval(() => fetchEmails(false), 1000);
    return () => clearInterval(interval);
  }, [fetchEmails, options.enabled, isInitialLoadComplete]);

  return {
    data,
    isLoading: !isInitialLoadComplete,
    permissionView,
    isInitialLoadComplete,
    revalidate: () => fetchEmails(false),
  };
}
