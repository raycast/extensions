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
