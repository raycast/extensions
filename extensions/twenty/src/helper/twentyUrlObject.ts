export const createTwentyUrlObject = (value: string) => {
  const urls = value.split(",").map((url: string) => url.trim());
  const primaryLinkUrl = urls[0];
  // removes protocol from url
  const primaryLinkLabel = primaryLinkUrl.replace(/^https?:\/\//, "");
  return {
    primaryLinkUrl,
    primaryLinkLabel,
    secondaryLinks: urls.slice(1).map((url: string) => ({
      url: url,
      label: url.replace(/^https?:\/\//, ""),
    })),
  };
};
