import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { useMemo, useState } from "react";

type RandomValue = {
  id: string;
  title: string;
  value: string;
  icon: Icon;
  keywords: string[];
};

const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{}:,.?";
const ALPHANUMERIC = `${LOWERCASE}${UPPERCASE}${DIGITS}`;

function pick(source: string): string {
  return source[randomInt(source.length)];
}

function shuffle(value: string): string {
  const characters = [...value];

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
  }

  return characters.join("");
}

function randomString(length: number, alphabet = ALPHANUMERIC): string {
  return Array.from({ length }, () => pick(alphabet)).join("");
}

function complexPassword(length = 20): string {
  if (length < 4) {
    throw new Error("Complex passwords must contain at least four characters.");
  }

  const required = [pick(LOWERCASE), pick(UPPERCASE), pick(DIGITS), pick(SYMBOLS)];
  const remaining = randomString(length - required.length, `${ALPHANUMERIC}${SYMBOLS}`);
  return shuffle(`${required.join("")}${remaining}`);
}

function randomDate(): string {
  const now = new Date();
  const tenYearsInMilliseconds = 10 * 365.25 * 24 * 60 * 60 * 1000;
  const timestamp = randomInt(
    Math.floor(now.getTime() - tenYearsInMilliseconds),
    Math.floor(now.getTime() + tenYearsInMilliseconds),
  );

  return new Date(timestamp).toISOString().slice(0, 10);
}

function randomEmail(): string {
  return `${randomString(10, LOWERCASE + DIGITS)}@example.com`;
}

function randomUrl(): string {
  return `https://${randomString(12, LOWERCASE + DIGITS)}.example.com/${randomString(8, LOWERCASE + DIGITS)}`;
}

function randomIpv4(): string {
  return Array.from({ length: 4 }, () => randomInt(0, 256)).join(".");
}

function generateValues(): RandomValue[] {
  const timestamp = new Date(randomInt(0, Math.floor(Date.now() + 10 * 365.25 * 24 * 60 * 60 * 1000)));

  return [
    {
      id: "date",
      title: "Date",
      value: randomDate(),
      icon: Icon.Calendar,
      keywords: ["日期", "day"],
    },
    {
      id: "uuid",
      title: "UUID v4",
      value: randomUUID(),
      icon: Icon.Fingerprint,
      keywords: ["guid", "識別碼"],
    },
    {
      id: "password",
      title: "Complex Password",
      value: complexPassword(),
      icon: Icon.Key,
      keywords: ["密碼", "secure", "credential"],
    },
    {
      id: "integer",
      title: "Integer",
      value: randomInt(-1_000_000, 1_000_001).toString(),
      icon: Icon.Hashtag,
      keywords: ["整數", "number"],
    },
    {
      id: "decimal",
      title: "Decimal",
      value: (randomInt(-100_000_000, 100_000_001) / 100).toFixed(2),
      icon: Icon.Calculator,
      keywords: ["小數", "float", "number"],
    },
    {
      id: "string",
      title: "Alphanumeric String",
      value: randomString(24),
      icon: Icon.Text,
      keywords: ["字串", "text"],
    },
    {
      id: "email",
      title: "Email",
      value: randomEmail(),
      icon: Icon.Envelope,
      keywords: ["電子郵件", "mail"],
    },
    {
      id: "url",
      title: "URL",
      value: randomUrl(),
      icon: Icon.Link,
      keywords: ["網址", "link"],
    },
    {
      id: "boolean",
      title: "Boolean",
      value: randomInt(2) === 1 ? "true" : "false",
      icon: Icon.Switch,
      keywords: ["布林", "bool"],
    },
    {
      id: "hex-color",
      title: "Hex Color",
      value: `#${randomBytes(3).toString("hex").toUpperCase()}`,
      icon: Icon.EyeDropper,
      keywords: ["顏色", "color"],
    },
    {
      id: "iso-timestamp",
      title: "ISO Timestamp",
      value: timestamp.toISOString(),
      icon: Icon.Clock,
      keywords: ["時間", "datetime"],
    },
    {
      id: "unix-timestamp",
      title: "Unix Timestamp",
      value: Math.floor(timestamp.getTime() / 1000).toString(),
      icon: Icon.Stopwatch,
      keywords: ["時間戳", "epoch"],
    },
    {
      id: "base64",
      title: "Base64",
      value: randomBytes(18).toString("base64"),
      icon: Icon.Code,
      keywords: ["編碼", "encoded"],
    },
    {
      id: "api-token",
      title: "API Token",
      value: `tok_${randomBytes(24).toString("base64url")}`,
      icon: Icon.Lock,
      keywords: ["權杖", "key", "secret"],
    },
    {
      id: "ipv4",
      title: "IPv4 Address",
      value: randomIpv4(),
      icon: Icon.Globe,
      keywords: ["ip", "位址", "network"],
    },
  ];
}

export default function Command() {
  const [generation, setGeneration] = useState(0);
  const values = useMemo(generateValues, [generation]);

  return (
    <List searchBarPlaceholder="Search random value types...">
      {values.map((item) => (
        <List.Item
          key={item.id}
          icon={item.icon}
          title={item.title}
          subtitle={item.value}
          keywords={item.keywords}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title={`Copy ${item.title}`} content={item.value} />
              <Action
                title="Regenerate All Values"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={() => setGeneration((current) => current + 1)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
