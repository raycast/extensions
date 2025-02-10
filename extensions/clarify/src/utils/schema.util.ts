export function getText(val: unknown): string {
  const none = "n/a";

  switch (typeof val) {
    case "undefined":
      return none;
    case "boolean":
      return val ? "yes" : "no";
    case "object":
      return val ? Object.values(val).join(" ") : none;
    case "number":
      return String(val);
    case "string":
      if (val.length === 0) {
        return none;
      }

      return isNaN(new Date(val).getTime()) ? String(val) : new Date(val).toLocaleString();
    default:
      return none;
  }
}

export function getName(val?: string | Record<string, string>): string {
  const none = "n/a";

  switch (typeof val) {
    case "undefined":
      return none;
    case "object":
      return val?.first_name ? `${val.first_name} ${val.last_name}` : none;
    case "string":
      return val.length === 0 ? none : val;
    default:
      return none;
  }
}
