import ColorHash from "color-hash";
import { OAuth2Client } from "google-auth-library";
import { SQLStatement } from "sql-template-strings";
import { Json } from "./types";

export let apiUrl = "";
apiUrl = "https://spiceblow.com";
// uncomment this line for local backend development
// apiUrl = "http://localhost:8045";

export const ellipsisReviver = (_key: string, value: Json) => {
  const maxLength = 100;
  const maxArrayItems = 3;
  if (typeof value === "string" && value.length > maxLength) {
    return value.slice(0, maxLength) + "...";
  }
  if (Array.isArray(value) && value.length > maxArrayItems) {
    return value.slice(0, maxArrayItems);
  }
  return value;
};

export function generateRandomId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export const googleClientId = `561871153864-av1vs99717luugrbiru0qccgodhcj9nm.apps.googleusercontent.com`;

const client = new OAuth2Client(googleClientId);

export async function validateGoogleToken(token?: string) {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token || "",
      audience: googleClientId,
    });

    const payload = ticket.getPayload();
    const googleEmail = payload?.email || "";
    return { googleEmail };
  } catch (error) {
    console.error("Error validating Google token:", error);
    return null;
  }
}

export function createBuyLink({ googleEmail }: { googleEmail: string }) {
  if (!googleEmail) {
    throw new Error("No email for license buy link found");
  }

  const url = new URL(`/spiceblow/stripe/buy`, apiUrl);

  url.searchParams.set("googleEmail", googleEmail);

  url.searchParams.set("embed", "0");
  url.searchParams.set("logo", "0");
  url.searchParams.set("dark", "1");

  return url.toString();
}

export function isImageUrl(url: string) {
  if (!url) return false;
  const isUrl = url.startsWith("http://") || url.startsWith("https://");
  if (!isUrl) {
    return false;
  }
  const withoutQueryParams = url.split("?")[0];
  // if ends with image extension
  const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".svg"];
  for (const ext of imageExtensions) {
    if (withoutQueryParams.endsWith(ext)) {
      return true;
    }
  }
  // if it is a google avatar url
  if (url.startsWith("https://lh3.googleusercontent.com/")) {
    return true;
  }
  // if it is a GitHub avatar url
  if (url.startsWith("https://avatars.githubusercontent.com/")) {
    return true;
  }
  // if it is a Twitter avatar url
  if (url.startsWith("https://pbs.twimg.com/")) {
    return true;
  }
  // if it is a Facebook avatar url
  if (url.startsWith("https://graph.facebook.com/")) {
    return true;
  }
  // if it is a LinkedIn avatar url
  if (url.startsWith("https://media.licdn.com/")) {
    return true;
  }
  // if it is a Gravatar url
  if (url.startsWith("https://www.gravatar.com/avatar/")) {
    return true;
  }
  return false;
}

export function hideSensitiveDataFromUrl(connectionString: string) {
  try {
    const url = new URL(connectionString);
    url.searchParams.delete("password");
    url.searchParams.delete("user");
    if (url.password) {
      url.password = "";
    }
    if (url.username) {
      url.username = "";
    }

    return url.toString();
  } catch {
    return connectionString;
  }
}

export function getStringColor(text: string, options?: { saturation?: number }) {
  const colorHash = new ColorHash({ lightness: 0.6, saturation: options?.saturation || 0.5 });
  return colorHash.hex(text || "");
}

export function getDatabaseConnectionType(url: string) {
  if (url.startsWith("postgres://")) {
    return "postgres" as const;
  }
  if (url.startsWith("postgresql://")) {
    return "postgres" as const;
  }
  if (url.startsWith("mysql://")) {
    return "mysql" as const;
  }
  // if (url.startsWith('sqlite://')) {
  //     return 'sqlite'
  // }
  return;
}

export function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

function formatParam(param: Json) {
  if (param === undefined) {
    return "null";
  }
  let str = JSON.stringify(param);
  const max = 50;
  if (str.length > max) {
    const lastChar = str[str.length - 1];
    str = str.slice(0, max - 4) + "..." + lastChar;
  }
  return str;
}

export function replaceSqlParameters(sql: string, parameters: Json[]) {
  // should replace $1 with parameters[0], etc
  // format the param with formatParam() function first
  return sql.replace(/\$(\d+)/g, (_, index) => {
    const param = parameters[parseInt(index) - 1];
    return formatParam(param);
  });
}

export function getQueryMarkdown(finalUpdateQueries: SQLStatement[]) {
  const queryText = finalUpdateQueries
    .map((x) => {
      let text = "";
      text += "```\n" + replaceSqlParameters(x.text, x.values) + "\n```";
      text += "\n\n";
      return text;
    })
    .join("\n\n");
  return queryText;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isTruthy<T>(value: T): value is NonNullable<T> {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  return true;
}
