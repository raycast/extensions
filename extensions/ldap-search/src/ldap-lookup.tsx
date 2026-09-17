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
import { readFileSync } from "node:fs";
import type { ConnectionOptions } from "node:tls";
import { Client } from "ldapts";

type LdapSecurity = "none" | "starttls" | "ldaps";

interface Preferences {
  ldapHost: string;
  ldapPort: string;
  ldapSecurity: LdapSecurity;
  ldapTLSVerify?: boolean;
  ldapCACert?: string;
  ldapUsername: string;
  ldapPassword: string;
  ldapSearchBase: string;
  phonePrefix?: string;
}

interface Person {
  givenName?: string;
  sn?: string;
  telephoneNumber?: string;
  department?: string;
  mail?: string;
  title?: string;
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

function tlsOptions(preferences: Preferences): ConnectionOptions | undefined {
  if ((preferences.ldapSecurity ?? "none") === "none") {
    return undefined;
  }
  const options: ConnectionOptions = {
    rejectUnauthorized: preferences.ldapTLSVerify !== false,
  };
  if (preferences.ldapCACert) {
    try {
      options.ca = readFileSync(preferences.ldapCACert);
    } catch {
      throw new Error(
        `Unable to read TLS CA certificate file: ${preferences.ldapCACert}`,
      );
    }
  }
  return options;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const abortRef = useRef<AbortController | undefined>(undefined);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function search(text: string) {
    abortRef.current?.abort();
    if (text.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    const security = preferences.ldapSecurity ?? "none";
    const scheme = security === "ldaps" ? "ldaps" : "ldap";
    const port = preferences.ldapPort || (security === "ldaps" ? "636" : "389");
    const target = `${scheme}://${preferences.ldapHost}:${port}`;

    let client: Client | undefined;
    try {
      const tls = tlsOptions(preferences);
      client = new Client({
        url: target,
        timeout: 10000,
        connectTimeout: 5000,
        tlsOptions: security === "ldaps" ? tls : undefined,
      });

      if (security === "starttls") {
        await client.startTLS(tls);
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
        },
      );

      const people = searchEntries.map((entry): Person => ({
        givenName: firstValue(entry.givenName),
        sn: firstValue(entry.sn),
        telephoneNumber: firstValue(entry.telephoneNumber),
        department: firstValue(entry.department),
        mail: firstValue(entry.mail),
        title: firstValue(entry.title),
      }));

      if (!controller.signal.aborted) {
        const query = text.trim().toLowerCase();
        const nameOf = (p: Person) =>
          `${p.givenName ?? ""} ${p.sn ?? ""}`.toLowerCase();
        people.sort((a, b) => {
          const rank = (p: Person) => {
            if (nameOf(p).includes(query)) return 0;
            if ((p.mail ?? "").toLowerCase().includes(query)) return 1;
            if ((p.telephoneNumber ?? "").includes(query)) return 2;
            return 3;
          };
          return rank(a) - rank(b) || nameOf(a).localeCompare(nameOf(b));
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
      await client?.unbind().catch(() => {});
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => search(searchText), 300);
    return () => clearTimeout(timer);
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
        const name = `${person.givenName ?? ""} ${person.sn ?? ""}`.trim();
        const phone = formatPhone(
          person.telephoneNumber,
          preferences.phonePrefix,
        );
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
