/**
 * Email handling module for 2FA code detection
 * Provides functionality to fetch and process 2FA codes from Apple Mail messages
 */

import { getPreferenceValues } from "@raycast/api";
import { Message, Preferences, SearchType } from "./types";
import { calculateLookBackMinutes } from "./utils";
import { useState, useEffect, useCallback, useRef } from "react";
import { runAppleScript } from "@raycast/utils";
import { extractCode } from "./utils";

/**
 * Storage interface for managing email message state
 * Tracks processed messages to avoid duplicate processing
 */
interface MessageStorage {
  messages: Message[]; // Currently displayed messages
  latestTimestamp: string | null; // For incremental updates
  hasCode: Record<string, boolean>; // Cache of message ID -> has code
}

/**
 * Fetches emails from Apple Mail using AppleScript
 * - Processes messages from the inbox
 * - Stops when reaching a known message ID or cutoff date
 * - Returns messages as delimited string for parsing
 */
async function getEmails(searchType: SearchType, sinceDate?: Date, knownGuids: string[] = []): Promise<Message[]> {
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
        
        -- Get messages until we hit a known one or reach cutoff
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
 *
 * Architecture:
 * - Maintains cache of processed messages to avoid duplicates
 * - Uses incremental updates based on message timestamps
 * - Integrates with Raycast's search and filtering capabilities
 */
export function useEmails(options: UseEmailsOptions) {
  // UI and loading state management
  const [data, setData] = useState<Message[]>([]);
  const [permissionView] = useState<JSX.Element | null>(null);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [isInitialLoadStarted, setIsInitialLoadStarted] = useState(false);
  const isLoadingRef = useRef(false);

  // Persistent cache for messages and incremental updates
  const storage = useRef<MessageStorage>({
    messages: [],
    latestTimestamp: null,
    hasCode: {},
  });

  // Process and filter new emails, update cache and state
  const processNewEmails = useCallback(
    (newEmails: Message[]) => {
      if (!options.enabled) return;

      const { messages, hasCode } = storage.current;

      // Process only new messages
      const updatedMessages = [...messages];
      let latestTimestamp = storage.current.latestTimestamp;

      newEmails.forEach((email) => {
        // Update latest timestamp if needed
        if (!latestTimestamp || email.message_date > latestTimestamp) {
          latestTimestamp = email.message_date;
        }

        // Skip if we already have this message
        if (hasCode[email.guid] !== undefined) return;

        // Check for code if in code search mode
        if (options.searchType === "code") {
          const code = extractCode(email.text);
          hasCode[email.guid] = !!code;
          if (!code) return;
        } else {
          hasCode[email.guid] = true;
        }

        // Filter by search text if provided
        if (options.searchText && !email.text.toLowerCase().includes(options.searchText.toLowerCase())) {
          return;
        }

        updatedMessages.push(email);
      });

      // Sort messages by date
      updatedMessages.sort((a, b) => new Date(b.message_date).getTime() - new Date(a.message_date).getTime());

      // Update storage
      storage.current = {
        messages: updatedMessages,
        latestTimestamp,
        hasCode,
      };

      // Update state
      setData(updatedMessages);
    },
    [options.searchText, options.searchType, options.enabled]
  );

  // Main email fetching with initial load optimization
  const fetchEmails = useCallback(async () => {
    if (!options.enabled || isLoadingRef.current) {
      return;
    }

    try {
      isLoadingRef.current = true;
      const knownGuids = Object.keys(storage.current.hasCode);
      const sinceDate = storage.current.latestTimestamp ? new Date(storage.current.latestTimestamp) : undefined;

      // For initial load, only fetch last 5 messages to prevent timeout
      const emails = await getEmails(options.searchType, sinceDate, knownGuids);

      if (emails.length > 0) {
        processNewEmails(emails);
      }

      // Mark initial load as complete if this was the first fetch
      if (!isInitialLoadComplete) {
        setIsInitialLoadComplete(true);
      }
    } catch (error) {
      console.error("Failed to get emails:", error);
      // If initial load fails, we still want to mark it as complete to allow retries
      if (!isInitialLoadComplete) {
        setIsInitialLoadComplete(true);
      }
    } finally {
      isLoadingRef.current = false;
    }
  }, [options.searchType, options.enabled, processNewEmails, isInitialLoadComplete]);

  // Lifecycle Effects

  // 1. Initial lightweight load
  useEffect(() => {
    if (!isInitialLoadStarted && options.enabled) {
      setIsInitialLoadStarted(true);
      fetchEmails();
    }
  }, [fetchEmails, options.enabled, isInitialLoadStarted]);

  // 2. Reset cache on search parameter changes
  useEffect(() => {
    storage.current = {
      messages: [],
      latestTimestamp: null,
      hasCode: {},
    };
    setIsInitialLoadComplete(false);
    setIsInitialLoadStarted(false);
    isLoadingRef.current = false;
  }, [options.searchText, options.searchType, options.enabled]);

  // 3. Background refresh every 10s after initial load
  useEffect(() => {
    if (!isInitialLoadComplete || !options.enabled) return;

    const intervalId = setInterval(fetchEmails, 10000);
    return () => clearInterval(intervalId);
  }, [fetchEmails, isInitialLoadComplete, options.enabled]);

  return {
    data,
    permissionView,
    revalidate: fetchEmails,
    isInitialLoadComplete,
  };
}
