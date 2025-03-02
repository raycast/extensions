export class NudgeConverter {
  private static URL_REGEX = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;

  static jsonToJsObject(input: string): string {
    try {
      const parsedObject = JSON.parse(input.replace(/"__undefined__"/g, "undefined"));

      const convertToJsObject = (obj: unknown): string => {
        if (obj === undefined) {
          return "undefined";
        }

        if (obj === null) {
          return "null";
        }

        if (typeof obj === "string") {
          // Escape quotes and handle special characters
          const escaped = obj
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            .replace(/\n/g, "\\n")
            .replace(/\r/g, "\\r")
            .replace(/\t/g, "\\t");
          return `"${escaped}"`;
        }

        if (typeof obj !== "object") {
          return String(obj);
        }

        if (Array.isArray(obj)) {
          return `[${obj.map(convertToJsObject).join(", ")}]`;
        }

        const entries = Object.entries(obj).map(([key, value]) => {
          const formattedKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : convertToJsObject(key);
          return `${formattedKey}: ${convertToJsObject(value)}`;
        });

        return `{ ${entries.join(", ")} }`;
      };

      return convertToJsObject(parsedObject);
    } catch (error) {
      throw new Error(`Invalid JSON input: ${(error as Error).message}`);
    }
  }

  static jsObjectToJson(input: string): string {
    try {
      // Replace undefined with a placeholder
      const normalizedInput = input.replace(/\bundefined\b/g, '"__undefined__"');

      // Convert property names that are valid identifiers to quoted strings
      const quotedProps = normalizedInput.replace(/(\b[a-zA-Z_$][a-zA-Z0-9_$]*\b)(?=\s*:)/g, '"$1"');

      // Evaluate the string to get an actual object
      // Using Function instead of eval for better scoping
      const obj = new Function(`return ${quotedProps}`)();

      // Convert to JSON, removing the undefined placeholders
      return JSON.stringify(obj).replace(/"__undefined__"/g, "null");
    } catch (error) {
      throw new Error(`Invalid JavaScript object literal: ${(error as Error).message}`);
    }
  }

  static fromUnicode(input: string): string {
    return input.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
  }

  static toUnicode(input: string): string {
    return input
      .split("")
      .map((char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`)
      .join("");
  }

  static trim(input: string): string {
    return input.trim();
  }

  static encodeUrl(input: string): string {
    const trimmedInput = input.trim();

    //Validate the input
    if (!this.isValidUrl(trimmedInput)) {
      throw new Error("Invalid URL format");
    }

    return encodeURIComponent(trimmedInput);
  }

  static decodeUrl(input: string): string {
    // Validate encoded URL
    try {
      const decoded = decodeURIComponent(input);

      // Optional: Validate decoded URL
      if (input !== encodeURIComponent(decoded)) {
        throw new Error("Invalid URL encoding");
      }

      return decoded;
    } catch (error) {
      throw new Error("Invalid URL encoding");
    }
  }

  static encodeBase64(input: string): string {
    try {
      return Buffer.from(input).toString("base64");
    } catch (error) {
      throw new Error(`Base64 encoding failed: ${(error as Error).message}`);
    }
  }

  static decodeBase64(input: string): string {
    try {
      return Buffer.from(input, "base64").toString("utf-8");
    } catch (error) {
      throw new Error(`Invalid Base64 encoding: ${(error as Error).message}`);
    }
  }

  static encodeHtmlEntities(input: string): string {
    return input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  static decodeHtmlEntities(input: string): string {
    return input
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
  }

  static toCamelCase(input: string): string {
    return input
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
      .replace(/^[A-Z]/, (c) => c.toLowerCase());
  }

  static toSnakeCase(input: string): string {
    return input
      .replace(/([a-z])([A-Z])/g, "$1_$2")
      .replace(/[-\s]+/g, "_")
      .toLowerCase();
  }

  static toKebabCase(input: string): string {
    return input
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/[_\s]+/g, "-")
      .toLowerCase();
  }

  static toPascalCase(input: string): string {
    return input.replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : "")).replace(/^(.)/, (c) => c.toUpperCase());
  }

  static formatJson(input: string, spaces = 2): string {
    try {
      const obj = JSON.parse(input);
      return JSON.stringify(obj, null, spaces);
    } catch (error) {
      throw new Error(`Invalid JSON: ${(error as Error).message}`);
    }
  }

  static minifyJson(input: string): string {
    try {
      const obj = JSON.parse(input);
      return JSON.stringify(obj);
    } catch (error) {
      throw new Error(`Invalid JSON: ${(error as Error).message}`);
    }
  }

  static sortJsonKeys(input: string): string {
    try {
      const obj = JSON.parse(input);

      const sortObject = <T>(object: T): T => {
        if (typeof object !== "object" || object === null) {
          return object;
        }

        if (Array.isArray(object)) {
          return object.map(sortObject) as unknown as T;
        }

        const sortedKeys = Object.keys(object as object).sort();
        const result: Record<string, unknown> = {};

        for (const key of sortedKeys) {
          result[key] = sortObject((object as Record<string, unknown>)[key]);
        }

        return result as unknown as T;
      };

      const sortedObj = sortObject(obj);
      return JSON.stringify(sortedObj, null, 2);
    } catch (error) {
      throw new Error(`Invalid JSON: ${(error as Error).message}`);
    }
  }

  private static isValidUrl(input: string): boolean {
    // Check against regex
    if (this.URL_REGEX.test(input)) return true;

    // Additional Checks
    try {
      new URL(input);
      return true;
    } catch {
      return false;
    }
  }
}
