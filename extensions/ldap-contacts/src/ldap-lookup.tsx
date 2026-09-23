import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  Keyboard,
  List,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { Client } from "ldapts";
import {
  connectionHost,
  formatTargetHost,
  startTLSWithDeadline,
  tlsOptions,
} from "./ldap";

type LdapSecurity = Preferences["ldapSecurity"];

interface Person {
  displayName?: string;
  givenName?: string;
  sn?: string;
  telephoneNumber?: string;
  department?: string;
  mail?: string;
  title?: string;
}

function personName(person: Person): string {
  if (person.displayName?.trim()) {
    return person.displayName.trim();
  }
  return [person.givenName, person.sn].filter(Boolean).join(" ").trim();
}

function isLoopbackHost(host: string): boolean {
  const normalized = host
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "");
  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "::1" ||
    normalized === "0:0:0:0:0:0:0:1" ||
    /^127(?:\.\d{1,3}){3}$/.test(normalized)
  );
}

function resolvePort(port: string | undefined, security: LdapSecurity): string {
  const trimmed = port?.trim();
  if (trimmed) {
    return trimmed;
  }
  return security === "ldaps" ? "636" : "389";
}

function firstValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return value[0] === undefined ? undefined : String(value[0]);
  }
  if (value === undefined || value === null) {
    return undefined;
  }
  if (Buffer.isBuffer(value)) {
    return value.toString();
  }
  return String(value);
}

function escapeFilter(value: string): string {
  return value.replace(
    /[\\()*\0]/g,
    (ch) => "\\" + ch.charCodeAt(0).toString(16).padStart(2, "0"),
  );
}

function formatPhone(
  raw: string | undefined,
  prefix: string | undefined,
): string {
  if (!raw) {
    return "";
  }
  if (prefix && raw.startsWith(prefix)) {
    return raw.slice(prefix.length);
  }
  return raw;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const abortRef = useRef<AbortController | undefined>(undefined);
  const clientRef = useRef<Client | undefined>(undefined);

  async function search(text: string) {
    abortRef.current?.abort();
    clientRef.current?.unbind().catch(() => {});
    if (text.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const security = preferences.ldapSecurity;

    if (security === "none" && !isLoopbackHost(preferences.ldapHost)) {
      setResults([]);
      setIsLoading(false);
      showToast({
        style: Toast.Style.Failure,
        title: "Plain LDAP is not allowed for remote servers",
        message:
          "The bind password would be sent unencrypted. Switch to StartTLS or LDAPS in the extension settings.",
      });
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    const scheme = security === "ldaps" ? "ldaps" : "ldap";
    const port = resolvePort(preferences.ldapPort, security);
    const target = `${scheme}://${formatTargetHost(preferences.ldapHost)}:${port}`;

    let client: Client | undefined;
    try {
      const tls = tlsOptions(preferences, connectionHost(preferences.ldapHost));
      client = new Client({
        url: target,
        timeout: 10000,
        connectTimeout: 5000,
        tlsOptions: security === "ldaps" ? tls : undefined,
      });
      clientRef.current = client;

      if (security === "starttls") {
        await startTLSWithDeadline(client, tls);
      }
      await client.bind(preferences.ldapUsername, preferences.ldapPassword);

      const term = escapeFilter(text.trim());
      const filter = `(&(objectClass=organizationalPerson)(!(objectclass=computer))(telephoneNumber=*)(|${[
        "displayName",
        "givenName",
        "sn",
        "sAMAccountName",
        "mail",
        "department",
        "title",
        "telephoneNumber",
      ]
        .map((attr) => `(${attr}=*${term}*)`)
        .join("")}))`;
      const attributes = [
        "displayName",
        "givenName",
        "sn",
        "telephoneNumber",
        "department",
        "mail",
        "title",
      ];
      const { searchEntries } = await client.search(
        preferences.ldapSearchBase,
        {
          scope: "sub",
          filter,
          attributes,
          sizeLimit: 50,
          timeLimit: 15,
        },
      );

      const people = searchEntries.map((entry): Person => ({
        displayName: firstValue(entry.displayName),
        givenName: firstValue(entry.givenName),
        sn: firstValue(entry.sn),
        telephoneNumber: firstValue(entry.telephoneNumber),
        department: firstValue(entry.department),
        mail: firstValue(entry.mail),
        title: firstValue(entry.title),
      }));

      if (!controller.signal.aborted) {
        const query = text.trim().toLowerCase();
        people.sort((a, b) => {
          const rank = (p: Person) => {
            if (personName(p).toLowerCase().includes(query)) return 0;
            if ((p.mail ?? "").toLowerCase().includes(query)) return 1;
            if ((p.telephoneNumber ?? "").includes(query)) return 2;
            return 3;
          };
          return (
            rank(a) - rank(b) || personName(a).localeCompare(personName(b))
          );
        });
        setResults(people);
        setIsLoading(false);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setResults([]);
        setIsLoading(false);
        const message = error instanceof Error ? error.message : String(error);
        console.error(`LDAP search failed for ${target}:`, error);
        showToast({
          style: Toast.Style.Failure,
          title: "LDAP search failed",
          message,
          primaryAction: {
            title: "Copy Error Details",
            shortcut: { modifiers: ["cmd"], key: "c" },
            onAction: (toast) => {
              Clipboard.copy(`${message}\n\nConnection: ${target}`);
              showToast({
                style: Toast.Style.Success,
                title: "Copied error details",
              });
              toast.hide();
            },
          },
        });
      }
    } finally {
      if (clientRef.current === client) {
        clientRef.current = undefined;
      }
      await client?.unbind().catch(() => {});
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => search(searchText), 300);
    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
      clientRef.current?.unbind().catch(() => {});
    };
  }, [searchText]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by name or phone number…"
      throttle
    >
      <List.EmptyView
        title={
          searchText.trim().length < 2
            ? "Type at least 2 characters to search"
            : `No results for "${searchText}"`
        }
        icon={Icon.MagnifyingGlass}
      />
      {results.map((person, index) => {
        const phone = formatPhone(
          person.telephoneNumber,
          preferences.phonePrefix,
        );
        const name =
          personName(person) || person.mail || phone || "Unknown entry";
        const full = `${name} (${phone})`;
        return (
          <List.Item
            key={index}
            title={name}
            subtitle={[person.title, person.department]
              .filter(Boolean)
              .join(" · ")}
            accessories={[
              { text: phone },
              { icon: Icon.Envelope, tooltip: person.mail },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Name (Phone)"
                  content={full}
                />
                <Action.CopyToClipboard
                  title="Copy Phone Number"
                  content={phone}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                  onCopy={() =>
                    showToast({
                      style: Toast.Style.Success,
                      title: "Copied",
                      message: full,
                    })
                  }
                />
                <Action.Paste
                  title="Paste Phone Number"
                  content={phone}
                  shortcut={{ modifiers: ["cmd"], key: "v" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
