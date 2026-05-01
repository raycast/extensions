import { Detection, RedactionMode } from "../types";

export function redactText(
  text: string,
  detections: Detection[],
  mode: RedactionMode
): string {
  if (detections.length === 0) return text;

  const sorted = [...detections].sort((a, b) => b.start - a.start);

  let result = text;
  const indexMap = new Map<string, number>();

  for (const detection of sorted) {
    const replacement = getReplacementText(detection, mode, indexMap);
    result =
      result.substring(0, detection.start) +
      replacement +
      result.substring(detection.end);
  }

  return result;
}

function getReplacementText(
  detection: Detection,
  mode: RedactionMode,
  indexMap: Map<string, number>
): string {
  switch (mode) {
    case "label":
      return "[REDACTED]";

    case "typed":
      return `[${detection.type}_REDACTED]`;

    case "indexed": {
      const key = `${detection.type}:${detection.value}`;
      if (!indexMap.has(key)) {
        const nextIndex =
          Array.from(indexMap.keys()).filter((k) =>
            k.startsWith(detection.type + ":")
          ).length + 1;
        indexMap.set(key, nextIndex);
      }
      return `[${detection.type}_${indexMap.get(key)}]`;
    }

    case "masked":
      return maskValue(detection.value, detection.type);

    default:
      return "[REDACTED]";
  }
}

function maskValue(value: string, type: string): string {
  switch (type) {
    case "EMAIL": {
      const emailParts = value.split("@");
      if (emailParts.length === 2) {
        const [local, domain] = emailParts;
        const maskedLocal =
          local.length <= 2
            ? "***"
            : local[0] + "***" + local[local.length - 1];
        const domainParts = domain.split(".");
        const maskedDomain =
          domainParts.length > 1
            ? "***." + domainParts[domainParts.length - 1]
            : "***";
        return `${maskedLocal}@${maskedDomain}`;
      }
      return "***@***.com";
    }

    case "PHONE_US": {
      const digits = value.replace(/\D/g, "");
      if (digits.length >= 10) {
        return `${digits.slice(0, 3)}-***-****`;
      }
      return "***-***-****";
    }

    case "CREDIT_CARD": {
      const cardDigits = value.replace(/\D/g, "");
      if (cardDigits.length >= 13) {
        return `****-****-****-${cardDigits.slice(-4)}`;
      }
      return "****-****-****-****";
    }

    case "IPV4": {
      const ipParts = value.split(".");
      if (ipParts.length === 4) {
        return `${ipParts[0]}.${ipParts[1]}.***.***.`;
      }
      return "***.***.***.***";
    }

    case "SSN": {
      const ssnDigits = value.replace(/\D/g, "");
      if (ssnDigits.length === 9) {
        return `***-**-${ssnDigits.slice(-4)}`;
      }
      return "***-**-****";
    }

    default:
      if (value.length <= 4) {
        return "***";
      } else if (value.length <= 8) {
        return value[0] + "***" + value[value.length - 1];
      } else {
        return value.slice(0, 2) + "***" + value.slice(-2);
      }
  }
}
