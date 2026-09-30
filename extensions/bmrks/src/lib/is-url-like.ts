// the function below tries to detect whether the value is like a URL
// value may not contain http:// or https:// or www.
// but it could still be a valid URL, like "example.com"
export function isUrlLike(value: string): boolean {
  const urlPattern =
    /^(?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/;

  return urlPattern.test(value);
}
