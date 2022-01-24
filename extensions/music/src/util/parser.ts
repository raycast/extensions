// use to parse run-applescript return (string)
// see start-playlist.tsx for a full example
export function parseResult<T>(raw: string): T[] {
  const lines = raw.trim().split("\n");
  return lines.map((line) => {
    let result = {};
    const properties = line.split("&nbsp;");
    properties.map((property) => {
      const [key, ...rest] = property.split(": ");
      const value = rest.join(": ");
      result = {
        ...result,
        [key]: value,
      };
    });
    return result as T;
  });
}
