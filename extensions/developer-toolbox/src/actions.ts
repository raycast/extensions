import formatISO from "date-fns/formatISO";
import getUnixTime from "date-fns/getUnixTime";
import toDate from "date-fns/toDate";
import jwt from "jsonwebtoken";

export type ActionResult = {
  value?: string;
  error?: Error;
};

export const base64Encode = (input: string): ActionResult => {
  const buffer = Buffer.from(input, "utf-8");
  return { value: buffer.toString("base64") };
};

export const base64Decode = (input: string): ActionResult => {
  const buffer = Buffer.from(input, "base64");
  return { value: buffer.toString("utf-8") };
};

export const localTimestamp = (): ActionResult => {
  const now = new Date();
  const timestamp = getUnixTime(now);
  return { value: timestamp.toString() };
};

export const localDateISO8601 = (): ActionResult => {
  const now = new Date();
  return { value: formatISO(now) };
};

export const timestampToDateString = (input: string): ActionResult => {
  try {
    const milliseconds =
      input.length > 10 ? parseInt(input) : parseInt(input) * 1000;
    return { value: formatISO(toDate(milliseconds)) };
  } catch {
    return { error: Error("Invalid timestamp value") };
  }
};

export const prettifyJSON = (input: string): ActionResult => {
  try {
    const parsed = JSON.parse(input);
    return { value: JSON.stringify(parsed, null, 4) };
  } catch {
    return { error: Error("Invalid JSON input") };
  }
};

export const minifyJSON = (input: string): ActionResult => {
  try {
    const parsed = JSON.parse(input);
    return { value: JSON.stringify(parsed) };
  } catch {
    return { error: Error("Invalid JSON input") };
  }
};

export const encodeURL = (url: string): ActionResult => {
  try {
    return { value: encodeURI(url) };
  } catch {
    return { error: Error("Invalid URL") };
  }
};

export const decodeURL = (url: string): ActionResult => {
  try {
    return { value: decodeURI(url) };
  } catch {
    return { error: Error("Invalid URL") };
  }
};

export const decodeJWT = (token: string): ActionResult => {
  try {
    if (!token) {
      return { value: "" };
    }

    const decoded = jwt.decode(token);
    return { value: JSON.stringify(decoded, null, 4) };
  } catch {
    return { error: Error("Invalid JWT") };
  }
};
