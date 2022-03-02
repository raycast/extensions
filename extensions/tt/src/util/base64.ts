export const base64 = (text: string) => Buffer.from(text, "utf8").toString("base64");
