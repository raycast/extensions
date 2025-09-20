export function getCookiesWithEditedValue(
  cookies: Record<string, string>,
  cookieToEdit: Record<string, string>,
  newValue: Record<string, string>,
): Record<string, string> {
  // search cookie by key and value and replace it with the new value
  return Object.fromEntries(
    Object.entries(cookies).map(([key, value]) => {
      if (key === cookieToEdit.key && value === cookieToEdit.value) {
        return [newValue.key, newValue.value];
      }
      return [key, value];
    }),
  );
}

export function toCookiesObject(cookiesString: string): Record<string, string> {
  const cookies = parseCookieString(cookiesString);

  return Object.fromEntries(Object.entries(cookies).filter(([key]) => key.trim() !== ""));
}

function parseCookieString(cookieString: string): Record<string, string> {
  return Object.fromEntries(
    cookieString
      .trim()
      .split(";")
      .map((cookie) => {
        const [key, value] = cookie.split("=");

        if (!key || !value) {
          return [];
        }

        return [key.trim(), value];
      })
      .filter((cookie) => cookie.length > 0),
  );
}
