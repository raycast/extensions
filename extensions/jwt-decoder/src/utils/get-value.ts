export const getValue = (value: string | number, key?: string) => {
  if (typeof value === "string") return value;
  switch (key) {
    case "exp":
    case "iat":
    case "auth_time":
      return new Date(value * 1000).toLocaleString();
    default:
      return JSON.stringify(value);
  }
};
