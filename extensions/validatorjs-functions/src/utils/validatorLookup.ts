// src/utils/validatorLookup.ts

import { Icon } from "@raycast/api";

interface ValidatorInfo {
  description: string;
  category: string;
  icon: Icon;
}

interface ValidatorLookup {
  [key: string]: ValidatorInfo;
}

export const validatorLookup: ValidatorLookup = {
  alpha: {
    description: "Object containing locale-specific alphabet regex patterns",
    category: "Validation",
    icon: Icon.Text,
  },
  blacklist: {
    description: "Remove characters that appear in the blacklist",
    category: "Sanitization",
    icon: Icon.XmarkCircle,
  },
  contains: {
    description: "Check if the string contains the seed",
    category: "Validation",
    icon: Icon.MagnifyingGlass,
  },
  equals: {
    description: "Check if the string matches the comparison",
    category: "Validation",
    icon: Icon.Text,
  },
  escape: {
    description: "Replace <, >, &, ', \" and / with HTML entities",
    category: "Sanitization",
    icon: Icon.Code,
  },
  isAbaRouting: {
    description: "Check if the string is an ABA routing number for US bank account / cheque",
    category: "Validation",
    icon: Icon.BankNote,
  },
  isAfter: {
    description: "Check if the string is a date that is after the specified date",
    category: "Validation",
    icon: Icon.Calendar,
  },
  isAlpha: {
    description: "Check if the string contains only letters (a-zA-Z)",
    category: "Validation",
    icon: Icon.Text,
  },
  isAlphanumeric: {
    description: "Check if the string contains only letters and numbers",
    category: "Validation",
    icon: Icon.TextCursor,
  },
  isAscii: {
    description: "Check if the string contains ASCII chars only",
    category: "Validation",
    icon: Icon.Terminal,
  },
  isBIC: {
    description: "Check if the string is a BIC (Bank Identification Code) or SWIFT code",
    category: "Validation",
    icon: Icon.BankNote,
  },
  isBase32: {
    description: "Check if the string is base32 encoded",
    category: "Validation",
    icon: Icon.Code,
  },
  isBase58: {
    description: "Check if the string is base58 encoded",
    category: "Validation",
    icon: Icon.Code,
  },
  isBase64: {
    description: "Check if the string is base64 encoded",
    category: "Validation",
    icon: Icon.Code,
  },
  isBefore: {
    description: "Check if the string is a date that is before the specified date",
    category: "Validation",
    icon: Icon.Calendar,
  },
  isBoolean: {
    description: "Check if the string is a boolean",
    category: "Validation",
    icon: Icon.CheckCircle,
  },
  isBtcAddress: {
    description: "Check if the string is a valid BTC address",
    category: "Validation",
    icon: Icon.Coins,
  },
  isByteLength: {
    description: "Check if the string's length (in UTF-8 bytes) falls in a range",
    category: "Validation",
    icon: Icon.Ruler,
  },
  isCreditCard: {
    description: "Check if the string is a credit card number",
    category: "Validation",
    icon: Icon.CreditCard,
  },
  isCurrency: {
    description: "Check if the string is a valid currency amount",
    category: "Validation",
    icon: Icon.BankNote,
  },
  isDataURI: {
    description: "Check if the string is a data uri format",
    category: "Validation",
    icon: Icon.Link,
  },
  isDate: {
    description: "Check if the string is a valid date",
    category: "Validation",
    icon: Icon.Calendar,
  },
  isDecimal: {
    description: "Check if the string represents a decimal number",
    category: "Validation",
    icon: Icon.Hashtag,
  },
  isDivisibleBy: {
    description: "Check if the string is a number that is divisible by another",
    category: "Validation",
    icon: Icon.Hashtag,
  },
  isEAN: {
    description: "Check if the string is an EAN (European Article Number)",
    category: "Validation",
    icon: Icon.Document,
  },
  isEmail: {
    description: "Check if the string is an email",
    category: "Validation",
    icon: Icon.Envelope,
  },
  isEmpty: {
    description: "Check if the string has a length of zero",
    category: "Validation",
    icon: Icon.XmarkCircle,
  },
  isEthereumAddress: {
    description: "Check if the string is an Ethereum address",
    category: "Validation",
    icon: Icon.Coins,
  },
  isFQDN: {
    description: "Check if the string is a fully qualified domain name",
    category: "Validation",
    icon: Icon.Globe,
  },
  isFloat: {
    description: "Check if the string is a float",
    category: "Validation",
    icon: Icon.Hashtag,
  },
  isFullWidth: {
    description: "Check if the string contains any full-width chars",
    category: "Validation",
    icon: Icon.Text,
  },
  isHSL: {
    description: "Check if the string is an HSL color",
    category: "Validation",
    icon: Icon.Circle,
  },
  isHalfWidth: {
    description: "Check if the string contains any half-width chars",
    category: "Validation",
    icon: Icon.Text,
  },
  isHash: {
    description: "Check if the string is a hash of specified algorithm",
    category: "Validation",
    icon: Icon.Lock,
  },
  isHexColor: {
    description: "Check if the string is a hexadecimal color",
    category: "Validation",
    icon: Icon.Circle,
  },
  isHexadecimal: {
    description: "Check if the string is a hexadecimal number",
    category: "Validation",
    icon: Icon.Hashtag,
  },
  isIBAN: {
    description: "Check if the string is an IBAN (International Bank Account Number)",
    category: "Validation",
    icon: Icon.BankNote,
  },
  isIMEI: {
    description: "Check if the string is a valid IMEI number",
    category: "Validation",
    icon: Icon.Phone,
  },
  isIP: {
    description: "Check if the string is an IP (version 4 or 6)",
    category: "Validation",
    icon: Icon.Globe,
  },
  isIPRange: {
    description: "Check if the string is an IP Range (version 4 or 6)",
    category: "Validation",
    icon: Icon.Globe,
  },
  isISBN: {
    description: "Check if the string is an ISBN (version 10 or 13)",
    category: "Validation",
    icon: Icon.Book,
  },
  isISIN: {
    description: "Check if the string is an ISIN (International Securities Identification Number)",
    category: "Validation",
    icon: Icon.BankNote,
  },
  isISO31661Alpha2: {
    description: "Check if the string is a valid ISO 3166-1 alpha-2 officially assigned country code",
    category: "Validation",
    icon: Icon.Globe,
  },
  isISO31661Alpha3: {
    description: "Check if the string is a valid ISO 3166-1 alpha-3 officially assigned country code",
    category: "Validation",
    icon: Icon.Globe,
  },
  isISO31661Numeric: {
    description: "Check if the string is a valid ISO 3166-1 numeric officially assigned country code",
    category: "Validation",
    icon: Icon.Globe,
  },
  isISO4217: {
    description: "Check if the string is a valid ISO 4217 currency code",
    category: "Validation",
    icon: Icon.BankNote,
  },
  isISO6346: {
    description: "Check if the string is a valid ISO 6346 shipping container identification number",
    category: "Validation",
    icon: Icon.Box,
  },
  isISO6391: {
    description: "Check if the string is a valid ISO 639-1 language code",
    category: "Validation",
    icon: Icon.Globe,
  },
  isISO8601: {
    description: "Check if the string is a valid ISO 8601 date",
    category: "Validation",
    icon: Icon.Calendar,
  },
  isISRC: {
    description: "Check if the string is a valid International Standard Recording Code (ISRC)",
    category: "Validation",
    icon: Icon.Music,
  },
  isISSN: {
    description: "Check if the string is an ISSN (International Standard Serial Number)",
    category: "Validation",
    icon: Icon.Document,
  },
  isIdentityCard: {
    description: "Check if the string is a valid identity card code",
    category: "Validation",
    icon: Icon.Person,
  },
  isIn: {
    description: "Check if the string is in an array of allowed values",
    category: "Validation",
    icon: Icon.CheckCircle,
  },
  isInt: {
    description: "Check if the string is an integer",
    category: "Validation",
    icon: Icon.Hashtag,
  },
  isJSON: {
    description: "Check if the string is valid JSON",
    category: "Validation",
    icon: Icon.Code,
  },
  isJWT: {
    description: "Check if the string is valid JWT token",
    category: "Validation",
    icon: Icon.Lock,
  },
  isLatLong: {
    description: "Check if the string is a valid latitude-longitude coordinate",
    category: "Validation",
    icon: Icon.Pin,
  },
  isLength: {
    description: "Check if the string's length falls in a range",
    category: "Validation",
    icon: Icon.Ruler,
  },
  isLicensePlate: {
    description: "Check if the string matches the format of a country's license plate",
    category: "Validation",
    icon: Icon.Car,
  },
  isLocale: {
    description: "Check if the string is a locale",
    category: "Validation",
    icon: Icon.Globe,
  },
  isLowercase: {
    description: "Check if the string is lowercase",
    category: "Validation",
    icon: Icon.Text,
  },
  isLuhnNumber: {
    description: "Check if the string passes the Luhn algorithm",
    category: "Validation",
    icon: Icon.Hashtag,
  },
  isMACAddress: {
    description: "Check if the string is a MAC address",
    category: "Validation",
    icon: Icon.Wifi,
  },
  isMD5: {
    description: "Check if the string is a MD5 hash",
    category: "Validation",
    icon: Icon.Lock,
  },
  isMailtoURI: {
    description: "Check if the string is a mailto uri format",
    category: "Validation",
    icon: Icon.Envelope,
  },
  isMagnetURI: {
    description: "Check if the string is a magnet uri format",
    category: "Validation",
    icon: Icon.Link,
  },
  isMimeType: {
    description: "Check if the string matches a valid MIME type format",
    category: "Validation",
    icon: Icon.Document,
  },
  isMobilePhone: {
    description: "Check if the string is a mobile phone number",
    category: "Validation",
    icon: Icon.Phone,
  },
  isMongoId: {
    description: "Check if the string is a valid hex-encoded representation of a MongoDB ObjectId",
    category: "Validation",
    icon: Icon.Text,
  },
  isMultibyte: {
    description: "Check if the string contains one or more multibyte chars",
    category: "Validation",
    icon: Icon.Text,
  },
  isNumeric: {
    description: "Check if the string contains only numbers",
    category: "Validation",
    icon: Icon.Hashtag,
  },
  isOctal: {
    description: "Check if the string is a valid octal number",
    category: "Validation",
    icon: Icon.Hashtag,
  },
  isPassportNumber: {
    description: "Check if the string is a valid passport number",
    category: "Validation",
    icon: Icon.Person,
  },
  isPort: {
    description: "Check if the string is a valid port number",
    category: "Validation",
    icon: Icon.Network,
  },
  isPostalCode: {
    description: "Check if the string is a postal code",
    category: "Validation",
    icon: Icon.Pin,
  },
  isRFC3339: {
    description: "Check if the string is a valid RFC 3339 date",
    category: "Validation",
    icon: Icon.Calendar,
  },
  isRgbColor: {
    description: "Check if the string is a rgb or rgba color",
    category: "Validation",
    icon: Icon.Circle,
  },
  isSemVer: {
    description: "Check if the string is a Semantic Versioning Specification (SemVer)",
    category: "Validation",
    icon: Icon.Tag,
  },
  isSlug: {
    description: "Check if the string is of type slug",
    category: "Validation",
    icon: Icon.Link,
  },
  isStrongPassword: {
    description: "Check if the string is a strong password",
    category: "Validation",
    icon: Icon.Lock,
  },
  isSurrogatePair: {
    description: "Check if the string contains any surrogate pairs chars",
    category: "Validation",
    icon: Icon.Text,
  },
  isTaxID: {
    description: "Check if the string is a valid Tax Identification Number",
    category: "Validation",
    icon: Icon.Person,
  },
  isTime: {
    description: "Check if the string is a valid time",
    category: "Validation",
    icon: Icon.Clock,
  },
  isURL: {
    description: "Check if the string is an URL",
    category: "Validation",
    icon: Icon.Link,
  },
  isULID: {
    description: "Check if the string is a ULID (Universally Unique Lexicographically Sortable Identifier)",
    category: "Validation",
    icon: Icon.Code,
  },
  isUUID: {
    description: "Check if the string is a UUID (version 3, 4 or 5)",
    category: "Validation",
    icon: Icon.Key,
  },
  isUppercase: {
    description: "Check if the string is uppercase",
    category: "Validation",
    icon: Icon.Text,
  },
  isVAT: {
    description: "Check if the string is a valid VAT number",
    category: "Validation",
    icon: Icon.Person,
  },
  isVariableWidth: {
    description: "Check if the string contains a mixture of full and half-width chars",
    category: "Validation",
    icon: Icon.Text,
  },
  isWhitelisted: {
    description: "Checks characters if they appear in the whitelist",
    category: "Validation",
    icon: Icon.CheckCircle,
  },
  ltrim: {
    description: "Trim characters from the left-side of the input",
    category: "Sanitization",
    icon: Icon.Text,
  },
  matches: {
    description: "Check if string matches the pattern",
    category: "Validation",
    icon: Icon.MagnifyingGlass,
  },
  normalizeEmail: {
    description: "Normalize an email address",
    category: "Sanitization",
    icon: Icon.Envelope,
  },
  rtrim: {
    description: "Trim characters from the right-side of the input",
    category: "Sanitization",
    icon: Icon.Text,
  },
  stripLow: {
    description: "Remove characters with a numerical value < 32 and 127",
    category: "Sanitization",
    icon: Icon.XmarkCircle,
  },
  toBoolean: {
    description: "Convert the input string to a boolean",
    category: "Conversion",
    icon: Icon.CheckCircle,
  },
  toDate: {
    description: "Convert the input string to a date, or null if the input is not a date",
    category: "Conversion",
    icon: Icon.Calendar,
  },
  toFloat: {
    description: "Convert the input string to a float, or NaN if the input is not a float",
    category: "Conversion",
    icon: Icon.Hashtag,
  },
  toInt: {
    description: "Convert the input string to an integer, or NaN if the input is not an integer",
    category: "Conversion",
    icon: Icon.Hashtag,
  },
  trim: {
    description: "Trim characters from both sides of the input",
    category: "Sanitization",
    icon: Icon.Text,
  },
  unescape: {
    description: "Replace HTML encoded entities with <, >, &, ', \" and /",
    category: "Sanitization",
    icon: Icon.Code,
  },
  whitelist: {
    description: "Remove characters that do not appear in the whitelist",
    category: "Sanitization",
    icon: Icon.CheckCircle,
  },
};
