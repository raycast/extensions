/**
 * Email handling module for 2FA code detection
 * Provides functionality to fetch and process 2FA codes from both Apple Mail and Gmail
 */

import { getPreferenceValues, Icon, Color } from "@raycast/api";
import { Message, Preferences, SearchType } from "./types";
import { calculateLookBackMinutes, extractCode, extractVerificationLink } from "./utils";
import { useState, useEffect, useCallback, useRef } from "react";
import { runAppleScript } from "@raycast/utils";
import { getGmailMessages, checkGmailAuth, processGmailContent } from "./gmail";
import { ErrorView } from "./components/ErrorView";
import React from "react";

/**
 * Storage interface for managing email message state
 * Tracks processed messages to avoid duplicate processing
 */
// interface MessageStorage {
//   hasCode: Record<string, boolean>; // Maps message IDs to whether they contain codes
//   latestTimestamp?: number; // Most recent message timestamp for incremental updates
// }

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

  // Updated AppleScript to better handle HTML content and quoted-printable encoding
  const script = `
    tell application "Mail"
      try
        set inb to mailbox "INBOX" of first account
        set knownGuids to {${knownGuidsStr}}
        set cutoffDate to (current date) - ${Math.floor(Date.now() / 1000) - cutoffSeconds}
        set output to ""
        set messageCount to 0
        
        repeat with i from 1 to 50
          try
            set m to message i of inb
            set msgId to id of m
            if knownGuids contains msgId then exit repeat
            set msgDate to date received of m
            if msgDate < cutoffDate then exit repeat
            
            set msgSubject to subject of m
            set msgSender to sender of m
            
            -- Improved HTML content handling
            set htmlContent to ""
            set plainContent to ""
            
            -- Get raw HTML source as the primary target
            try
              set htmlContent to source of m
            on error
              set htmlContent to ""
            end try
            
            -- Always get plain content as fallback
            try
              set plainContent to content of m
            on error
              set plainContent to ""
            end try

            set msgDateStr to msgDate as «class isot» as string
            
            -- Need to ensure we preserve the exact content without line wrapping
            -- that could confuse quoted-printable encoding
            set output to output & msgId & "$break$" & msgSubject & "$break$" & msgSender & "$break$" & htmlContent & "$break$" & plainContent & "$break$" & msgDateStr & "$end$"
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

    // Process using the same logic as Gmail
    const messages: Message[] = [];

    // Use a more robust split that handles potential content having the delimiter
    const rawMessages = result.split("$end$").filter((line) => line.trim().length > 0);

    for (const rawMsg of rawMessages) {
      const parts = rawMsg.split("$break$");
      if (parts.length < 6) continue; // Skip malformed messages

      const [guid, subject, sender, htmlContent, plainContent, dateStr] = parts;

      // Convert date string to Date object
      const date = new Date(dateStr);

      // Process HTML content to handle quoted-printable encoding issues
      // This is particularly important for Apple Mail
      let processedHtmlContent = htmlContent || "";

      // Handle quoted-printable encoding in HTML content
      // Fix line continuations (= at end of line followed by newline)
      processedHtmlContent = processedHtmlContent.replace(/=\r?\n/g, "");

      // Use Gmail's processor function with Apple Mail data
      const processedMsg = processGmailContent(
        guid,
        subject,
        sender,
        date,
        processedHtmlContent || null, // Process HTML content to fix encoding issues
        plainContent || null, // Plain content
        "", // No snippet equivalent in Apple Mail
        lookbackMinutes
      );

      if (processedMsg) {
        messages.push(processedMsg);
      }
    }

    return messages;
  } catch (error) {
    console.error("Failed to fetch Apple Mail messages:", error);
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

        // For "all" search type, include all messages regardless of code
        if (options.searchType === "all") {
          return true;
        }

        // For "code" search type, check if there's a code or link
        const code = email.displayText ? extractCode(email.displayText) : null;
        const hasCode = code !== null;

        // Also check for verification links (only if enabled in preferences)
        const hasLink = preferences.enableVerificationLinks !== false && extractVerificationLink(email.text) !== null;

        // Include messages with either codes or links (if links are enabled)
        return hasCode || hasLink;
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
    [options.searchType, preferences.enableVerificationLinks]
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
    [options.enabled, options.searchType, processNewEmails, emailSource, preferences.enableVerificationLinks]
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
