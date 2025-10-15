export const useDomain = (query: string) => {
  const queryArr = query.split(" ");
  const domainMatch = queryArr[0].match(
    /[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,16}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)?/gi,
  );

  let domain = domainMatch?.[0] ?? null;

  if (domain && !domain.startsWith("http")) {
    domain = `https://${domain}`;
    try {
      const url = new URL(domain);
      return url.hostname;
    } catch {
      // empty
    }
  }

  if (!domain) {
    try {
      const url = new URL(query);
      return url.hostname;
    } catch {
      return null;
    }
  }

  return domain;
};
