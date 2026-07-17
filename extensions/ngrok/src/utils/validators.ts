export function validatePort(value: string | undefined) {
  if (value === "") return "Required field.";
  const nValue = Number(value);
  if (isNaN(nValue) || nValue > 65535) return "Enter a valid port.";
}

export function validateTag(value: string | undefined) {
  if (value && value.length > 24) {
    return "Max 24 characters.";
  }
}

export function validateCloudEdgeLabels(value: string | undefined) {
  if (!value) return "Required field.";

  const pairs = value.split(",");

  for (const pair of pairs) {
    const parts = pair.split("=");

    if (parts.length !== 2 || parts[0].trim() === "" || parts[1].trim() === "") {
      return "Invalid format";
    }
  }

  const names = pairs.map((pair) => pair.split("=")[0].trim());
  const uniqueNames = new Set(names);
  if (names.length !== uniqueNames.size) {
    return "Duplicate labels found";
  }
}
