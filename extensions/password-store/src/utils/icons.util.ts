import { Icon } from "@raycast/api";

/**
 * Returns the appropriate icon based on the provided text prefix.
 *
 * @param {string} text - The text used to determine the icon.
 * @returns {Icon} The corresponding icon for the text prefix, or a default lock icon if no match is found.
 */
export const getPasswordIcon = (text: string): Icon => {
  // Mapping of text prefixes to their corresponding icons
  const iconMap: { [key: string]: Icon } = {
    "Cards/": Icon.CreditCard,
    "Dev/": Icon.Terminal,
    "Mails/": Icon.Envelope,
    "Finance/": Icon.Coins,
    "Games/": Icon.GameController,
    "Social/": Icon.TwoPeople,
    "Personal/": Icon.Person,
    "SSH/": Icon.Terminal,
    "Shops/": Icon.Gift,
    "Security/": Icon.Fingerprint,
  };

  // Find the first key in iconMap that matches the start of the text
  const key = Object.keys(iconMap).find((k) => text.startsWith(k));

  // Return the corresponding icon if a match is found, otherwise return the default lock icon
  return key ? iconMap[key] : Icon.Lock;
};

/**
 * Returns the appropriate icon based on the provided option text.
 *
 * @param {string} text - The text used to determine the icon.
 * @returns {Icon} The corresponding icon for the text option, or a default minus icon if no match is found.
 */
export const getOptionIcon = (text: string): Icon => {
  // Mapping of text options to their corresponding icons
  const iconMap: { [key: string]: Icon } = {
    Password: Icon.Key,
    OTP: Icon.Hourglass,
    email: Icon.Envelope,
    username: Icon.Person,
    user: Icon.Person,
    url: Icon.Link,
    Number: Icon.CreditCard,
    Brand: Icon.CreditCard,
    "Cardholder Name": Icon.Person,
    Expiration: Icon.Calendar,
    "Security Code": Icon.Code,
  };

  // Return the corresponding icon if a match is found, otherwise return the default minus icon
  return iconMap[text] || Icon.Minus;
};
