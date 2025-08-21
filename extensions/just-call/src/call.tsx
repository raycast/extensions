/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  open,
  Icon,
  LocalStorage,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface Contact {
  name: string;
  phones: { label: string; number: string }[];
}

const CONTACTS_CACHE_KEY = "cached_contacts";
const CACHE_TIMESTAMP_KEY = "cache_timestamp";
const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

export default function Command() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionError, setPermissionError] = useState(false);

  useEffect(() => {
    loadContactsWithCache();
  }, []);

  async function loadContactsWithCache() {
    try {
      // Try to load from cache first
      const cachedContacts =
        await LocalStorage.getItem<string>(CONTACTS_CACHE_KEY);
      const cacheTimestamp =
        await LocalStorage.getItem<string>(CACHE_TIMESTAMP_KEY);

      if (cachedContacts && cacheTimestamp) {
        const timestamp = parseInt(cacheTimestamp);
        const now = Date.now();

        // Check if cache is still valid (not older than 30 days)
        if (now - timestamp < CACHE_DURATION) {
          const parsedContacts = JSON.parse(cachedContacts) as Contact[];
          setContacts(parsedContacts);
          setIsLoading(false);

          // Show that we loaded from cache
          await showToast({
            style: Toast.Style.Success,
            title: "Contacts Loaded",
            message: "Using cached contacts",
          });
          return;
        }
      }

      // If no valid cache, load fresh contacts
      await loadContacts(true);
    } catch (error) {
      console.error("Error loading cached contacts:", error);
      // If cache loading fails, try loading fresh contacts
      await loadContacts(true);
    }
  }

  async function loadContacts(saveToCache: boolean = false) {
    try {
      // First, try a simple test to see if we have access
      const testScript = `
        tell application "Contacts"
          try
            count of people
            return "ok"
          on error
            return "error"
          end try
        end tell
      `;

      const { stdout: testResult } = await execAsync(
        `osascript -e '${testScript}'`,
      );

      if (testResult.trim() === "error") {
        setPermissionError(true);
        setIsLoading(false);
        await showToast({
          style: Toast.Style.Failure,
          title: "Permission Required",
          message: "Grant access to Contacts in System Settings",
        });
        return;
      }

      // Now load the actual contacts
      const script = `
        tell application "Contacts"
          set contactList to {}
          set allPeople to every person
          
          repeat with aPerson in allPeople
            set personName to ""
            set phoneList to {}
            
            try
              set firstName to first name of aPerson
              if firstName is missing value then set firstName to ""
            on error
              set firstName to ""
            end try
            
            try
              set lastName to last name of aPerson
              if lastName is missing value then set lastName to ""
            on error
              set lastName to ""
            end try
            
            if firstName is not "" or lastName is not "" then
              set personName to (firstName & " " & lastName) as string
            else
              try
                set companyName to organization of aPerson
                if companyName is not missing value then
                  set personName to companyName
                end if
              end try
            end if
            
            if personName is not "" then
              set phoneNumbers to phones of aPerson
              
              if (count of phoneNumbers) > 0 then
                repeat with aPhone in phoneNumbers
                  try
                    set phoneValue to value of aPhone
                    set phoneLabel to label of aPhone
                    set end of phoneList to phoneLabel & ":" & phoneValue
                  end try
                end repeat
                
                if (count of phoneList) > 0 then
                  set phoneString to ""
                  repeat with i from 1 to count of phoneList
                    if i > 1 then
                      set phoneString to phoneString & "|"
                    end if
                    set phoneString to phoneString & item i of phoneList
                  end repeat
                  
                  set end of contactList to personName & "||" & phoneString
                end if
              end if
            end if
          end repeat
          
          set AppleScript's text item delimiters to "\\n"
          return contactList as string
        end tell
      `.trim();

      const { stdout, stderr } = await execAsync(
        `osascript -e '${script.replace(/'/g, "'\"'\"'")}'`,
      );

      if (stderr && stderr.includes("not authorized")) {
        setPermissionError(true);
        setIsLoading(false);
        return;
      }

      if (!stdout || stdout.trim() === "") {
        setContacts([]);
        setIsLoading(false);
        return;
      }

      const lines = stdout.split("\n").filter((line) => line.trim() !== "");
      const parsedContacts: Contact[] = [];

      for (const line of lines) {
        const [name, phonesStr] = line.split("||");
        if (name && phonesStr) {
          const phones = phonesStr
            .split("|")
            .map((phoneStr) => {
              const [label, number] = phoneStr.split(":");
              return {
                label: formatLabel(label),
                number: number ? number.trim() : "",
              };
            })
            .filter((phone) => phone.number);

          if (phones.length > 0) {
            parsedContacts.push({ name: name.trim(), phones });
          }
        }
      }

      parsedContacts.sort((a, b) => a.name.localeCompare(b.name));
      setContacts(parsedContacts);

      // Save to cache if requested
      if (saveToCache && parsedContacts.length > 0) {
        try {
          await LocalStorage.setItem(
            CONTACTS_CACHE_KEY,
            JSON.stringify(parsedContacts),
          );
          await LocalStorage.setItem(
            CACHE_TIMESTAMP_KEY,
            Date.now().toString(),
          );
          await showToast({
            style: Toast.Style.Success,
            title: "Contacts Cached",
            message: `${parsedContacts.length} contacts saved for quick access`,
          });
        } catch (cacheError) {
          console.error("Error saving to cache:", cacheError);
          // Continue even if caching fails
        }
      }

      setIsLoading(false);
    } catch (error: unknown) {
      console.error("Error loading contacts:", error);

      // Check for various permission-related errors
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorCode =
        error && typeof error === "object" && "code" in error
          ? (error as { code: number }).code
          : undefined;

      if (
        errorMessage.includes("not authorized") ||
        errorMessage.includes("Application isn't running") ||
        errorMessage.includes("execution error") ||
        errorCode === 1
      ) {
        setPermissionError(true);
        await showToast({
          style: Toast.Style.Failure,
          title: "Contacts Access Required",
          message: "Please grant permission in System Settings",
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Failed to load contacts",
        });
      }

      setIsLoading(false);
    }
  }

  function formatLabel(label: string): string {
    if (!label) return "Phone";

    const cleanLabel = label.replace(/_\$!</, "").replace(/>!\$_/, "").trim();

    const labelMap: { [key: string]: string } = {
      mobile: "Mobile",
      home: "Home",
      work: "Work",
      main: "Main",
      iphone: "iPhone",
      other: "Other",
    };

    const lowerLabel = cleanLabel.toLowerCase();
    return labelMap[lowerLabel] || cleanLabel;
  }

  async function makeCall(phoneNumber: string, contactName: string) {
    try {
      const cleanNumber = phoneNumber.replace(/[\s\-().]/g, "");
      const telUrl = `tel:${cleanNumber}`;

      await open(telUrl);
      await showToast({
        style: Toast.Style.Success,
        title: "Calling",
        message: `${contactName}`,
      });
    } catch (error) {
      console.error("Error making call:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Call Failed",
        message: "Ensure Phone app is installed and Handoff is enabled",
      });
    }
  }

  if (permissionError) {
    return (
      <List isLoading={false}>
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="Contacts Permission Required"
          description="Grant Raycast access to your Contacts to use this extension"
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Fix Permissions">
                <Action
                  title="Open Contacts Privacy Settings"
                  icon={Icon.LockUnlocked}
                  onAction={() => {
                    open(
                      "x-apple.systempreferences:com.apple.preference.security?Privacy_Contacts",
                    );
                  }}
                />
                <Action
                  title="Open Automation Settings"
                  icon={Icon.Gear}
                  onAction={() => {
                    open(
                      "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation",
                    );
                  }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Retry After Granting Permission"
                  icon={Icon.ArrowClockwise}
                  onAction={() => {
                    setPermissionError(false);
                    setIsLoading(true);
                    loadContacts(true);
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Help">
                <Action
                  title="How to Grant Permission"
                  icon={Icon.QuestionMarkCircle}
                  onAction={() => {
                    showToast({
                      style: Toast.Style.Animated,
                      title: "How to Grant Permission",
                      message:
                        "1. Open Settings → Privacy & Security → Contacts → Enable Raycast\n2. Also check Automation → Raycast → Contacts",
                    });
                  }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search contacts by name or phone..."
    >
      {contacts.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.PersonCircle}
          title="No Contacts Found"
          description="No contacts with phone numbers in your Contacts app"
          actions={
            <ActionPanel>
              <Action
                title="Refresh Contacts"
                icon={Icon.ArrowClockwise}
                onAction={async () => {
                  setIsLoading(true);
                  await loadContacts(true);
                }}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action
                title="Open Contacts App"
                icon={Icon.PersonLines}
                onAction={() => {
                  open("/System/Applications/Contacts.app");
                }}
              />
            </ActionPanel>
          }
        />
      ) : (
        contacts.map((contact, contactIndex) => {
          if (contact.phones.length > 1) {
            return (
              <List.Section key={contactIndex} title={contact.name}>
                {contact.phones.map((phone, phoneIndex) => (
                  <List.Item
                    key={`${contactIndex}-${phoneIndex}`}
                    icon={Icon.Phone}
                    title={phone.label}
                    subtitle={phone.number}
                    keywords={[contact.name, phone.number]}
                    actions={
                      <ActionPanel>
                        <ActionPanel.Section>
                          <Action
                            title={`Call ${contact.name}`}
                            icon={Icon.Phone}
                            onAction={() =>
                              makeCall(phone.number, contact.name)
                            }
                          />
                          <Action.CopyToClipboard
                            title="Copy Number"
                            content={phone.number}
                            shortcut={{ modifiers: ["cmd"], key: "c" }}
                          />
                        </ActionPanel.Section>
                        <ActionPanel.Section>
                          <Action
                            title="Refresh Contacts"
                            icon={Icon.ArrowClockwise}
                            onAction={async () => {
                              setIsLoading(true);
                              await loadContacts(true);
                            }}
                            shortcut={{ modifiers: ["cmd"], key: "r" }}
                          />
                          <Action
                            title="Clear Cache"
                            icon={Icon.Trash}
                            onAction={async () => {
                              await LocalStorage.removeItem(CONTACTS_CACHE_KEY);
                              await LocalStorage.removeItem(
                                CACHE_TIMESTAMP_KEY,
                              );
                              await showToast({
                                style: Toast.Style.Success,
                                title: "Cache Cleared",
                                message: "Contact cache has been cleared",
                              });
                              setIsLoading(true);
                              await loadContacts(true);
                            }}
                            shortcut={{
                              modifiers: ["cmd", "shift"],
                              key: "delete",
                            }}
                          />
                        </ActionPanel.Section>
                      </ActionPanel>
                    }
                  />
                ))}
              </List.Section>
            );
          } else {
            const phone = contact.phones[0];
            return (
              <List.Item
                key={contactIndex}
                icon={Icon.Phone}
                title={contact.name}
                subtitle={phone.number}
                keywords={[contact.name, phone.number]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action
                        title="Call"
                        icon={Icon.Phone}
                        onAction={() => makeCall(phone.number, contact.name)}
                      />
                      <Action.CopyToClipboard
                        title="Copy Number"
                        content={phone.number}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action
                        title="Refresh Contacts"
                        icon={Icon.ArrowClockwise}
                        onAction={async () => {
                          setIsLoading(true);
                          await loadContacts(true);
                        }}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                      />
                      <Action
                        title="Clear Cache"
                        icon={Icon.Trash}
                        onAction={async () => {
                          await LocalStorage.removeItem(CONTACTS_CACHE_KEY);
                          await LocalStorage.removeItem(CACHE_TIMESTAMP_KEY);
                          await showToast({
                            style: Toast.Style.Success,
                            title: "Cache Cleared",
                            message: "Contact cache has been cleared",
                          });
                          setIsLoading(true);
                          await loadContacts(true);
                        }}
                        shortcut={{
                          modifiers: ["cmd", "shift"],
                          key: "delete",
                        }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          }
        })
      )}
    </List>
  );
}
