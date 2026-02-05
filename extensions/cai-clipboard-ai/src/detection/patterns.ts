export const PATTERNS = {
  url: /https?:\/\/[^\s]+/i,

  // Only match clear addresses with street numbers
  // Use word boundaries to avoid false positives like "$2 on the stock exchange"
  address:
    /\d{1,5}[,\s]+[\w\s]+\b(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct|place|pl|calle|c\/|avenida|avda|paseo|plaza|rue|straße|strasse|str|gasse|platz|weg|via|piazza|corso|viale|largo|rua|praça|travessa|alameda|laan|straat|plein)\b/i,

  email: /[\w.-]+@[\w.-]+\.\w+/i,

  phone: /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
};
