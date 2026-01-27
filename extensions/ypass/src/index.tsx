import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  List,
  showHUD,
  popToRoot,
} from "@raycast/api";
import { spawn, ChildProcess } from "child_process";
import { useState, useEffect, useCallback, useRef } from "react";
import { MACOS_PATH, getPasswordGeneratorPath } from "./utils";

type Stage =
  | "loading-domains"
  | "select-domain"
  | "unlock-touch"
  | "select-username"
  | "password-touch"
  | "enter-pin"
  | "success"
  | "error";

interface UsernameEntry {
  index: string;
  name: string;
  version: number;
  isDomainOnly?: boolean;
}

interface StoredUsername {
  name: string;
  version: number;
}

interface DomainEntry {
  domain: string;
  usernames: StoredUsername[];
}

// Parse domains from --list output
// New format:
//   domain.com
//     - (domain-only) (v1)
//     - username (v2)
function parseDomains(output: string): DomainEntry[] {
  const entries: DomainEntry[] = [];
  const lines = output.split("\n");

  for (const line of lines) {
    // Match domain line (no indentation, no version)
    const domainMatch = line.match(/^(\S+)$/);
    if (domainMatch) {
      entries.push({
        domain: domainMatch[1],
        usernames: [],
      });
      continue;
    }
    // Match username with version: "  - username (v1)" or "  - (domain-only) (v1)"
    const usernameMatch = line.match(/^\s+-\s+(.+?)\s+\(v(\d+)\)/);
    if (usernameMatch && entries.length > 0) {
      const name = usernameMatch[1].trim();
      const version = parseInt(usernameMatch[2], 10);
      // "(domain-only)" becomes empty string
      const storedName = name === "(domain-only)" ? "" : name;
      entries[entries.length - 1].usernames.push({
        name: storedName,
        version,
      });
    }
  }

  return entries;
}

export default function Command() {
  const PASSWORD_GENERATOR_PATH = getPasswordGeneratorPath();

  const [stage, setStage] = useState<Stage>("loading-domains");
  const [domains, setDomains] = useState<DomainEntry[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [selectedUsername, setSelectedUsername] = useState<string>("");
  const [isNewDomain, setIsNewDomain] = useState<boolean>(false);
  const [usernames, setUsernames] = useState<UsernameEntry[]>([]);
  const [output, setOutput] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [pinError, setPinError] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>("");
  const [usernameSearch, setUsernameSearch] = useState<string>("");

  const processRef = useRef<ChildProcess | null>(null);
  const outputBufferRef = useRef<string>("");

  // Load domains from CLI state on mount
  useEffect(() => {
    loadDomainsFromState();
  }, []);

  // Cleanup process on unmount
  useEffect(() => {
    return () => {
      if (processRef.current) {
        processRef.current.kill();
      }
    };
  }, []);

  // Load domains by calling CLI with --list
  const loadDomainsFromState = useCallback(() => {
    setStage("loading-domains");
    outputBufferRef.current = "";
    setOutput("");
    setError("");

    const proc = spawn(PASSWORD_GENERATOR_PATH, ["--list"], {
      env: { ...process.env, PATH: MACOS_PATH },
    });

    processRef.current = proc;

    proc.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      outputBufferRef.current += text;
    });

    proc.stderr?.on("data", (data: Buffer) => {
      const text = data.toString();
      outputBufferRef.current += text;

      if (text.includes("Touch YubiKey to unlock state")) {
        setStage("unlock-touch");
      } else if (text.toLowerCase().includes("error")) {
        setError(outputBufferRef.current);
        setStage("error");
      }
    });

    proc.on("close", (code) => {
      if (code === 0) {
        const parsed = parseDomains(outputBufferRef.current);
        setDomains(parsed);
        setStage("select-domain");
      } else if (code !== null) {
        setError(outputBufferRef.current || `Process exited with code ${code}`);
        setStage("error");
      }
    });

    proc.on("error", (err) => {
      setError(
        `Failed to start process: ${err.message}\n\nMake sure ypass is installed and the path is correct in preferences.`,
      );
      setStage("error");
    });
  }, [PASSWORD_GENERATOR_PATH]);

  // Delete user from CLI state (requires YubiKey touch)
  const handleDeleteUser = useCallback(
    (domain: string, username: string) => {
      // Kill current process
      if (processRef.current) {
        processRef.current.kill();
        processRef.current = null;
      }

      setStage("unlock-touch");
      setOutput("");
      outputBufferRef.current = "";

      const proc = spawn(
        PASSWORD_GENERATOR_PATH,
        [domain, "--delete-user", username],
        { env: { ...process.env, PATH: MACOS_PATH } },
      );

      proc.stderr?.on("data", (data: Buffer) => {
        const text = data.toString();
        outputBufferRef.current += text;

        if (text.includes("Deleted username")) {
          showHUD(`Deleted "${username}" from ${domain}`);
          // Update local state and go back to username selection
          setUsernames((prev) => prev.filter((u) => u.name !== username));
          setDomains((prev) =>
            prev.map((d) =>
              d.domain === domain
                ? {
                    ...d,
                    usernames: d.usernames.filter((u) => u.name !== username),
                  }
                : d,
            ),
          );
          setStage("select-username");
        } else if (text.includes("not found")) {
          showHUD(`Username "${username}" not found`);
          setStage("select-username");
        }
      });

      proc.on("error", (err) => {
        setError(`Failed to delete user: ${err.message}`);
        setStage("error");
      });
    },
    [PASSWORD_GENERATOR_PATH],
  );

  // Delete domain from CLI state (requires YubiKey touch)
  const handleDeleteDomain = useCallback(
    (domain: string) => {
      // Kill current process
      if (processRef.current) {
        processRef.current.kill();
        processRef.current = null;
      }

      setStage("unlock-touch");
      setOutput("");
      outputBufferRef.current = "";

      const proc = spawn(PASSWORD_GENERATOR_PATH, [domain, "--delete-domain"], {
        env: { ...process.env, PATH: MACOS_PATH },
      });

      proc.stderr?.on("data", (data: Buffer) => {
        const text = data.toString();
        outputBufferRef.current += text;

        if (text.includes("Deleted domain")) {
          showHUD(`Deleted "${domain}" from state`);
          // Update local state and go back to domain selection
          setDomains((prev) => prev.filter((d) => d.domain !== domain));
          setStage("select-domain");
        } else if (text.includes("not found")) {
          showHUD(`Domain "${domain}" not found in state`);
          setStage("select-domain");
        }
      });

      proc.on("error", (err) => {
        setError(`Failed to delete domain: ${err.message}`);
        setStage("error");
      });
    },
    [PASSWORD_GENERATOR_PATH],
  );

  // Bump version for a domain/username (requires YubiKey touch)
  const handleBumpVersion = useCallback(
    (domain: string, username: string) => {
      if (processRef.current) {
        processRef.current.kill();
        processRef.current = null;
      }

      setStage("unlock-touch");
      setOutput("");
      outputBufferRef.current = "";

      // Build args: domain --bump-version [-u username]
      const args = [domain, "--bump-version"];
      if (username) {
        args.push("-u", username);
      }

      const proc = spawn(PASSWORD_GENERATOR_PATH, args, {
        env: { ...process.env, PATH: MACOS_PATH },
      });

      proc.stderr?.on("data", (data: Buffer) => {
        const text = data.toString();
        outputBufferRef.current += text;

        // Match "Bumped version ... from X to Y"
        const match = text.match(/from (\d+) to (\d+)/);
        if (match) {
          const newVersion = parseInt(match[2], 10);
          showHUD(`Version bumped to v${newVersion}`);
          // Update local state
          setDomains((prev) =>
            prev.map((d) =>
              d.domain === domain
                ? {
                    ...d,
                    usernames: d.usernames.map((u) =>
                      u.name === username ? { ...u, version: newVersion } : u,
                    ),
                  }
                : d,
            ),
          );
          // Update usernames list for current view
          setUsernames((prev) =>
            prev.map((u) =>
              (u.isDomainOnly && username === "") ||
              (!u.isDomainOnly && u.name === username)
                ? { ...u, version: newVersion }
                : u,
            ),
          );
          setStage("select-username");
        } else if (text.includes("not found")) {
          showHUD(`Not found`);
          setStage("select-username");
        }
      });

      proc.on("error", (err) => {
        setError(`Failed to bump version: ${err.message}`);
        setStage("error");
      });
    },
    [PASSWORD_GENERATOR_PATH],
  );

  // Go back to domain selection
  const goBackToDomains = useCallback(() => {
    setSelectedDomain("");
    setSelectedUsername("");
    setUsernameSearch("");
    setStage("select-domain");
  }, []);

  // Select domain and show username selection from cached data
  const selectDomain = useCallback(
    (domain: string, cachedUsernames?: StoredUsername[], isNew?: boolean) => {
      setSelectedDomain(domain);
      setIsNewDomain(isNew ?? false);
      setSearchText("");
      setUsernameSearch("");

      // Build usernames list for selection
      const usernameEntries: UsernameEntry[] = [];

      // Check if there's a stored domain-only entry
      const domainOnlyEntry = cachedUsernames?.find((u) => u.name === "");
      usernameEntries.push({
        index: "d",
        name: "Domain-only mode",
        version: domainOnlyEntry?.version ?? 1,
        isDomainOnly: true,
      });

      // Add cached usernames if available (excluding domain-only)
      if (cachedUsernames) {
        cachedUsernames
          .filter((u) => u.name !== "")
          .forEach((u, i) => {
            usernameEntries.push({
              index: String(i + 1),
              name: u.name,
              version: u.version,
            });
          });
      }

      setUsernames(usernameEntries);
      setStage("select-username");
    },
    [],
  );

  // Start password generation with specific domain, optional username, and version
  // isNewUsername: if true, don't use --skip-state so CLI can add the new user to state
  const startProcess = useCallback(
    (
      domain: string,
      username?: string,
      version?: number,
      isNewUsername?: boolean,
    ) => {
      // Prevent multiple simultaneous processes
      if (processRef.current) {
        processRef.current.kill();
        processRef.current = null;
      }

      setSelectedDomain(domain);
      if (username) {
        setSelectedUsername(username);
      }
      outputBufferRef.current = "";
      setOutput("");
      setError("");

      // Build args based on whether this is a new username
      const args = [domain];
      if (isNewUsername) {
        // New username: need state unlock to save it, then password touch
        setStage("unlock-touch");
      } else {
        // Existing username: use --skip-state to avoid second state unlock
        args.push("--skip-state");
        args.push("-v", String(version ?? 1));
        setStage("password-touch");
      }
      if (username) {
        args.push("-u", username);
      }

      const proc = spawn(PASSWORD_GENERATOR_PATH, args, {
        env: { ...process.env, PATH: MACOS_PATH },
      });

      processRef.current = proc;

      proc.stdout?.on("data", (data: Buffer) => {
        const text = data.toString();
        outputBufferRef.current += text;
        setOutput((prev) => prev + text);

        if (text.includes("copied to clipboard")) {
          setStage("success");
          showHUD("Password copied to clipboard!");
          setTimeout(() => popToRoot(), 1000);
        }
      });

      proc.stderr?.on("data", (data: Buffer) => {
        const text = data.toString();
        outputBufferRef.current += text;
        setOutput((prev) => prev + text);

        // Check accumulated buffer to determine stage (handles buffering issues)
        const buffer = outputBufferRef.current;

        if (buffer.includes("Enter PIN:")) {
          setStage("enter-pin");
        } else if (buffer.includes("Touch YubiKey for password")) {
          setStage("password-touch");
        } else if (buffer.includes("Touch YubiKey to unlock state")) {
          setStage("unlock-touch");
        }

        // Check latest text for completion/error
        if (text.includes("copied to clipboard")) {
          setStage("success");
          showHUD("Password copied to clipboard!");
          setTimeout(() => popToRoot(), 1000);
        } else if (
          text.toLowerCase().includes("error") &&
          !text.includes("Touch YubiKey")
        ) {
          setError(outputBufferRef.current);
          setStage("error");
        }
      });

      proc.on("error", (err) => {
        setError(
          `Failed to start process: ${err.message}\n\nMake sure ypass is installed and the path is correct in preferences.`,
        );
        setStage("error");
      });

      proc.on("close", (code) => {
        // code is null when process is killed intentionally
        if (
          code !== 0 &&
          code !== null &&
          !outputBufferRef.current.includes("copied to clipboard")
        ) {
          setError(
            outputBufferRef.current || `Process exited with code ${code}`,
          );
          setStage("error");
        }
      });
    },
    [PASSWORD_GENERATOR_PATH],
  );

  const sendInput = useCallback((input: string) => {
    if (processRef.current?.stdin) {
      processRef.current.stdin.write(input + "\n");
    }
  }, []);

  const handlePinSubmit = useCallback(
    (values: { pin: string }) => {
      if (!values.pin) return;

      setPinError(false); // Clear error before checking

      // First verify PIN with --check-pin (no YubiKey needed)
      const checkProc = spawn(PASSWORD_GENERATOR_PATH, ["--check-pin"], {
        env: { ...process.env, PATH: MACOS_PATH },
      });

      checkProc.stdin?.write(values.pin + "\n");
      checkProc.stdin?.end();

      checkProc.on("close", (code) => {
        if (code === 0) {
          // PIN correct, send to password generation process
          sendInput(values.pin);
        } else {
          // PIN wrong, show error
          setPinError(true);
        }
      });
    },
    [sendInput, PASSWORD_GENERATOR_PATH],
  );

  // Stage: Loading domains (initial unlock)
  if (stage === "loading-domains") {
    return (
      <Detail
        markdown={`# Touch YubiKey

Touch your YubiKey to unlock state and load domains...

*Waiting for hardware interaction...*`}
      />
    );
  }

  // Stage: Select Domain
  if (stage === "select-domain") {
    const filteredDomains = domains.filter((d) =>
      d.domain.toLowerCase().includes(searchText.toLowerCase()),
    );
    const showNewDomainOption =
      searchText.length > 0 &&
      !domains.some((d) => d.domain.toLowerCase() === searchText.toLowerCase());

    return (
      <List
        searchBarPlaceholder="Search or enter new domain..."
        searchText={searchText}
        onSearchTextChange={setSearchText}
        filtering={false}
      >
        {showNewDomainOption && (
          <List.Item
            icon={Icon.Plus}
            title={`Use "${searchText}"`}
            subtitle="New domain"
            actions={
              <ActionPanel>
                <Action
                  title="Select Domain"
                  onAction={() => selectDomain(searchText, [], true)}
                />
              </ActionPanel>
            }
          />
        )}
        <List.Section title="Stored Domains">
          {filteredDomains.map((entry) => (
            <List.Item
              key={entry.domain}
              icon={Icon.Globe}
              title={entry.domain}
              accessories={
                entry.usernames.length > 0
                  ? [
                      {
                        text: `${entry.usernames.length} entr${entry.usernames.length > 1 ? "ies" : "y"}`,
                        icon: Icon.Person,
                      },
                    ]
                  : undefined
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Select Domain"
                    onAction={() =>
                      selectDomain(entry.domain, entry.usernames, false)
                    }
                  />
                  <Action
                    title="Refresh Domains"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => loadDomainsFromState()}
                  />
                  <Action
                    title="Delete from State"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => handleDeleteDomain(entry.domain)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
        {domains.length === 0 && !showNewDomainOption && (
          <List.EmptyView
            icon={Icon.Key}
            title="No stored domains"
            description="Type a domain name to get started"
          />
        )}
      </List>
    );
  }

  // Stage: Touch YubiKey to unlock
  if (stage === "unlock-touch") {
    return (
      <Detail
        markdown={`# Touch YubiKey

Touch your YubiKey to unlock state...

${selectedDomain ? `**Domain:** \`${selectedDomain}\`` : ""}

*Waiting for hardware interaction...*`}
      />
    );
  }

  // Stage: Select Username (from cached data, no CLI interaction yet)
  if (stage === "select-username") {
    const filteredUsernames = usernames.filter(
      (u) =>
        u.isDomainOnly ||
        u.name.toLowerCase().includes(usernameSearch.toLowerCase()),
    );

    // Show "add new" option when user types something not in the list
    const showNewUsernameOption =
      usernameSearch.length > 0 &&
      !usernames.some(
        (u) =>
          !u.isDomainOnly &&
          u.name.toLowerCase() === usernameSearch.toLowerCase(),
      );

    return (
      <List
        searchBarPlaceholder="Select username, type new, or leave empty..."
        searchText={usernameSearch}
        onSearchTextChange={setUsernameSearch}
        filtering={false}
      >
        <List.Section title={`Username for ${selectedDomain}`}>
          {/* New username option when typing */}
          {showNewUsernameOption && (
            <List.Item
              icon={Icon.Plus}
              title={`Use "${usernameSearch}"`}
              subtitle="New username (requires state unlock)"
              actions={
                <ActionPanel>
                  <Action
                    title="Use This Username"
                    onAction={() =>
                      startProcess(
                        selectedDomain,
                        usernameSearch,
                        1, // new usernames start at version 1
                        true, // new username always needs state unlock
                      )
                    }
                  />
                  <Action
                    title="Back to Domains"
                    icon={Icon.ArrowLeft}
                    shortcut={{ modifiers: ["cmd"], key: "b" }}
                    onAction={goBackToDomains}
                  />
                </ActionPanel>
              }
            />
          )}

          {/* Existing usernames from cached data */}
          {filteredUsernames.map((entry) => (
            <List.Item
              key={entry.index}
              icon={entry.isDomainOnly ? Icon.Globe : Icon.Person}
              title={entry.name}
              subtitle={entry.isDomainOnly ? "No username" : undefined}
              accessories={[{ text: `v${entry.version}` }]}
              actions={
                <ActionPanel>
                  <Action
                    title={
                      entry.isDomainOnly ? "Use Domain Only" : "Select Username"
                    }
                    onAction={() => {
                      if (entry.isDomainOnly) {
                        // Domain-only: needs state unlock only if new domain
                        startProcess(
                          selectedDomain,
                          undefined,
                          entry.version,
                          isNewDomain,
                        );
                      } else {
                        // Existing username: no state unlock needed
                        startProcess(
                          selectedDomain,
                          entry.name,
                          entry.version,
                          false,
                        );
                      }
                    }}
                  />
                  <Action
                    title="Bump Version"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "b" }}
                    onAction={() =>
                      handleBumpVersion(
                        selectedDomain,
                        entry.isDomainOnly ? "" : entry.name,
                      )
                    }
                  />
                  {!entry.isDomainOnly && (
                    <Action
                      title="Delete Username from State"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      onAction={() =>
                        handleDeleteUser(selectedDomain, entry.name)
                      }
                    />
                  )}
                  <Action
                    title="Back to Domains"
                    icon={Icon.ArrowLeft}
                    shortcut={{ modifiers: ["cmd"], key: "b" }}
                    onAction={goBackToDomains}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      </List>
    );
  }

  // Stage: Touch YubiKey for password
  if (stage === "password-touch") {
    return (
      <Detail
        markdown={`# Touch YubiKey Again

Touch your YubiKey to generate password...

**Domain:** \`${selectedDomain}\`${selectedUsername ? `\n**Username:** \`${selectedUsername}\`` : ""}

*Waiting for hardware interaction...*`}
      />
    );
  }

  // Stage: Enter PIN
  if (stage === "enter-pin") {
    return (
      <Form
        enableDrafts={false}
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Submit Pin" onSubmit={handlePinSubmit} />
          </ActionPanel>
        }
      >
        <Form.Description title="Domain" text={selectedDomain} />
        {selectedUsername && (
          <Form.Description title="Username" text={selectedUsername} />
        )}
        {pinError && (
          <Form.Description title="" text="Wrong PIN. Please try again." />
        )}
        <Form.PasswordField
          id="pin"
          title="PIN"
          placeholder="Enter your YubiKey PIN"
          autoFocus
          error={pinError ? "Wrong PIN" : undefined}
        />
      </Form>
    );
  }

  // Stage: Success
  if (stage === "success") {
    const subtitle = selectedUsername
      ? `${selectedDomain} / ${selectedUsername}`
      : selectedDomain;
    return (
      <Detail
        markdown={`# Password Generated!

Password for \`${subtitle}\` has been copied to your clipboard.

It will be cleared in 20 seconds.`}
      />
    );
  }

  // Stage: Error
  if (stage === "error") {
    return (
      <Detail
        markdown={`# Error

\`\`\`
${error || output || "Unknown error"}
\`\`\`

**Troubleshooting:**
- Make sure \`ykchalresp\` is installed: \`brew install ykpers\`
- Check that your YubiKey is connected
- Verify the binary path in extension preferences

Current PATH includes:
- /opt/homebrew/bin (Apple Silicon)
- /usr/local/bin (Intel Mac)`}
        actions={
          <ActionPanel>
            <Action
              title="Try Again"
              onAction={() => {
                setOutput("");
                setError("");
                setUsernames([]);
                setUsernameSearch("");
                setSelectedUsername("");
                setSelectedDomain("");
                processRef.current?.kill();
                processRef.current = null;
                loadDomainsFromState();
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return <Detail markdown="Loading..." />;
}
