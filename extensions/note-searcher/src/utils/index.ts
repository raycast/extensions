import { Index } from "@upstash/vector";

// Upstash Vector credentials
const UPSTASH_VECTOR_URL = "https://cosmic-marmot-49561-us1-vector.upstash.io";
const UPSTASH_VECTOR_TOKEN =
  "ABcFMGNvc21pYy1tYXJtb3QtNDk1NjEtdXMxYWRtaW5PR1JoTWpRd056Z3ROVGsyWlMwME1HTTBMVGs0TmprdE5HRTFPVEEyWmpReU1qZzA=";

// Initialize Upstash Vector index
export const vectorIndex = new Index({
  url: UPSTASH_VECTOR_URL,
  token: UPSTASH_VECTOR_TOKEN,
});

// Simple URL extraction regex
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

/**
 * Extract URLs from a text string
 * @param text The text to extract URLs from
 * @returns Array of extracted URLs
 */
export function extractURLs(text: string): string[] {
  return text.match(URL_REGEX) || [];
}

/**
 * Check if a string is a URL
 * @param text The text to check
 * @returns True if the text is a URL, false otherwise
 */
export function isURL(text: string): boolean {
  return URL_REGEX.test(text);
}

/**
 * Generate a simple vector embedding for text (for demo purposes)
 * This is a very simplified version - in a real application, you would use a proper embedding model
 * @param text The text to embed
 * @returns Vector embedding as number[]
 */
export function generateEmbedding(text: string): number[] {
  // This is a very simple "embedding" that just counts character frequency
  // In a real app, you'd use an actual embedding model like OpenAI's or Hugging Face's

  // Create a vector with 1536 dimensions as required by our Upstash Vector database
  const vector: number[] = new Array(1536).fill(0);

  // Normalize text
  const normalizedText = text.toLowerCase().replace(/[^\w\s]/g, "");

  // Generate a simple frequency-based embedding
  // Since we need 1536 dimensions, we'll use a more complex approach to fill the vector

  // Basic character frequency for first 128 positions (ASCII characters)
  for (let i = 0; i < normalizedText.length; i++) {
    const char = normalizedText.charCodeAt(i);
    if (char < 128) {
      vector[char] += 1;
    }
  }

  // N-grams (character pairs) for positions 128-1024
  if (normalizedText.length > 1) {
    for (let i = 0; i < normalizedText.length - 1; i++) {
      const char1 = normalizedText.charCodeAt(i) % 32;
      const char2 = normalizedText.charCodeAt(i + 1) % 32;
      const ngramIndex = 128 + (char1 * 32 + char2);
      if (ngramIndex < 1024) {
        vector[ngramIndex] += 1;
      }
    }
  }

  // Word-level features for the remaining positions
  const words = normalizedText.split(/\s+/);
  words.forEach((word, idx) => {
    // Word length
    if (word.length > 0 && idx < 256) {
      const lengthIndex = 1024 + idx;
      vector[lengthIndex] = word.length / 20; // Normalize word length
    }

    // First letter of word
    if (word.length > 0 && idx < 256) {
      const firstCharIndex = 1280 + idx;
      vector[firstCharIndex] = word.charCodeAt(0) / 128; // Normalize char code
    }
  });

  // Normalize the vector
  const sum = vector.reduce((acc, val) => acc + val, 0);
  if (sum > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] = vector[i] / sum;
    }
  }

  return vector;
}

/**
 * Generate a random ID for storing notes
 * @returns A random string ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Note categories for classification
 */
export enum NoteCategory {
  TRAVEL = "TRAVEL",
  PNR = "PNR",
  PASSWORD = "PASSWORD",
  CONTACT = "CONTACT",
  CODE = "CODE",
  SHOPPING = "SHOPPING",
  GENERAL = "GENERAL",
  ARTICLE = "ARTICLE",
  REMINDER = "REMINDER",
}

/**
 * Detects the category of a note based on its content
 * @param text The note content
 * @returns Detected category
 */
export function detectNoteCategory(text: string): NoteCategory {
  const lowerText = text.toLowerCase();

  // Check for travel-related content
  if (/\b(flight|travel|trip|vacation|booking|hotel|reservation)\b/i.test(lowerText)) {
    return NoteCategory.TRAVEL;
  }

  // Check for PNR/booking references
  if (
    /\b(pnr|booking|confirmation|reservation)\s*(number|code|reference|id)?[:# ]?[a-z0-9]{5,}/i.test(lowerText) ||
    /\b[a-z]{2}\d{6}\b/i.test(lowerText)
  ) {
    // Common PNR format like TK123456
    return NoteCategory.PNR;
  }

  // Check for passwords or credentials
  if (/\b(password|login|credential|account|username|user name|email|key)\b/i.test(lowerText)) {
    return NoteCategory.PASSWORD;
  }

  // Check for contact information
  if (
    /\b(contact|phone|tel|email|address|person|name)\b/i.test(lowerText) ||
    /\b[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}\b/i.test(lowerText) || // Phone number pattern
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/i.test(lowerText)
  ) {
    // Email pattern
    return NoteCategory.CONTACT;
  }

  // Check for reminder-related content
  if (
    /\b(remind|reminder|remember|schedule|todo|to-do|task|deadline|due|alert|notification)\b/i.test(lowerText) ||
    /\b(tomorrow|next week|later|upcoming|tonight|morning|evening|afternoon)\b/i.test(lowerText) ||
    /\b\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?\b/i.test(lowerText) || // Date pattern
    /\b\d{1,2}:\d{2}\s*(am|pm)?\b/i.test(lowerText)
  ) {
    // Time pattern
    return NoteCategory.REMINDER;
  }

  // Check for shopping lists
  if (
    /\b(shopping|list|buy|purchase|grocery|mart|store|market)\b/i.test(lowerText) ||
    /^(shopping list|to buy|grocery list)/i.test(lowerText)
  ) {
    return NoteCategory.SHOPPING;
  }

  // Check for code snippets
  if (
    /\b(function|const|var|let|import|export|class|interface|if|else|for|while|return|=>)\b/i.test(lowerText) ||
    /{[\s\S]*}/.test(text) || // Curly braces with content
    /\$\(.*\)/.test(text)
  ) {
    // Common in shell scripts, jQuery
    return NoteCategory.CODE;
  }

  // Check if this is an article (for parsed web content)
  if (text.length > 500 && /\b(article|blog|post|news)\b/i.test(lowerText)) {
    return NoteCategory.ARTICLE;
  }

  // Default category
  return NoteCategory.GENERAL;
}

/**
 * Extract important data from text based on patterns
 * @param text The text to analyze
 * @returns Object containing extracted data
 */
export function extractDataFromText(text: string): Record<string, string[]> {
  const result: Record<string, string[]> = {
    emails: [],
    phones: [],
    urls: [],
    dates: [],
  };

  // Extract emails
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+[.][A-Za-z]{2,}\b/g;
  result.emails = text.match(emailRegex) || [];

  // Extract phone numbers
  const phoneRegex = /\b[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}\b/g;
  result.phones = text.match(phoneRegex) || [];

  // Extract URLs (using our existing function)
  result.urls = extractURLs(text);

  // Extract dates (simple format detection)
  const dateRegex = /\b\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}\b/g;
  result.dates = text.match(dateRegex) || [];

  return result;
}

/**
 * Smart templates for different note types
 */
export interface NoteTemplate {
  id: string;
  name: string;
  category: NoteCategory;
  icon: string;
  template: string;
  description: string;
}

/**
 * Collection of available templates
 */
export const TEMPLATES: NoteTemplate[] = [
  {
    id: "shopping-list",
    name: "Shopping List",
    category: NoteCategory.SHOPPING,
    icon: "🛒",
    description: "Create a new shopping list",
    template: `# Shopping List

## Items
- Item 1
- Item 2
- Item 3

## Store
Store name

## Notes
Additional notes`,
  },
  {
    id: "travel-plan",
    name: "Travel Plan",
    category: NoteCategory.TRAVEL,
    icon: "✈️",
    description: "Plan your trip details",
    template: `# Travel Plan

## Trip Details
Destination: 
Dates: 
Purpose: 

## Flights
Outbound: 
Return: 
PNR: 

## Accommodation
Hotel: 
Address: 
Confirmation: 

## Notes
`,
  },
  {
    id: "password",
    name: "Password Entry",
    category: NoteCategory.PASSWORD,
    icon: "🔑",
    description: "Save a new password securely",
    template: `# Password Entry

## Account Details
Service: 
Username: 
Email: 
Password: 

## Security
2FA Enabled: Yes/No
Recovery Codes: 

## Notes
Last changed: 
`,
  },
  {
    id: "contact",
    name: "Contact Information",
    category: NoteCategory.CONTACT,
    icon: "👤",
    description: "Save contact details",
    template: `# Contact Information

## Personal Details
Name: 
Company: 
Title: 

## Contact
Email: 
Phone: 
Address: 

## Social Media
LinkedIn: 
Twitter: 

## Notes
How we met: 
`,
  },
  {
    id: "code-snippet",
    name: "Code Snippet",
    category: NoteCategory.CODE,
    icon: "💻",
    description: "Save a code snippet with metadata",
    template: `# Code Snippet

## Description
Brief description of what this code does

## Language
Programming language

## Code
\`\`\`
// Your code here
\`\`\`

## Notes
Reference or source: 
`,
  },
];

/**
 * Creates a template instance with the given data
 * @param templateId The template ID to use
 * @param data Map of placeholder values
 * @returns Filled template text
 */
export function createFromTemplate(templateId: string, data: Record<string, string> = {}): string {
  // Find the template
  const template = TEMPLATES.find((t) => t.id === templateId);
  if (!template) {
    return "Template not found";
  }

  // Start with the template text
  let result = template.template;

  // Replace placeholders if data is provided
  Object.entries(data).forEach(([key, value]) => {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  });

  return result;
}

/**
 * Simple webscraper data structure
 */
export interface ScrapedUrlInfo {
  url: string;
  title: string;
  domain: string;
  description: string;
}

/**
 * Creates a default ScrapedUrlInfo object with information from the URL
 * @param url The original URL
 * @param domain The extracted domain name
 * @returns A basic ScrapedUrlInfo object
 */
function createDefaultUrlInfo(url: string, domain: string): ScrapedUrlInfo {
  // Get a friendly site name from domain
  let siteName = domain.split(".")[0];
  siteName = siteName.charAt(0).toUpperCase() + siteName.slice(1);

  return {
    url,
    title: `Content from ${siteName}`,
    domain,
    description: `This is a link to ${url}`,
  };
}

/**
 * Helper to extract meta data with multiple patterns
 */
function extractMetaContent(html: string, metaNames: string[]): string | null {
  for (const name of metaNames) {
    // Try property pattern
    const propertyRegex = new RegExp(`<meta\\s+property=["']${name}["']\\s+content=["']([^"']+)["']`, "i");
    let match = propertyRegex.exec(html);
    if (match && match[1]) return match[1].trim();

    // Try reversed pattern (content first, then property)
    const reversedPropertyRegex = new RegExp(`<meta\\s+content=["']([^"']+)["']\\s+property=["']${name}["']`, "i");
    match = reversedPropertyRegex.exec(html);
    if (match && match[1]) return match[1].trim();

    // Try name pattern
    const nameRegex = new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["']([^"']+)["']`, "i");
    match = nameRegex.exec(html);
    if (match && match[1]) return match[1].trim();

    // Try reversed name pattern
    const reversedNameRegex = new RegExp(`<meta\\s+content=["']([^"']+)["']\\s+name=["']${name}["']`, "i");
    match = reversedNameRegex.exec(html);
    if (match && match[1]) return match[1].trim();
  }

  return null;
}

/**
 * Creates a LinkedIn specific content parser
 * @param html The HTML content
 * @param url The original URL
 * @returns Scraped information or null
 */
function parseLinkedInContent(html: string, url: string, domain: string): ScrapedUrlInfo | null {
  // Extract title (LinkedIn specific patterns)
  const title = extractMetaContent(html, ["og:title", "twitter:title"]);

  // Extract description
  const description = extractMetaContent(html, ["og:description", "twitter:description", "description"]);

  // If no metadata found, use LinkedIn-specific default
  if (!title && !description) {
    const defaultInfo = createDefaultUrlInfo(url, domain);
    defaultInfo.title = "LinkedIn Post";
    defaultInfo.description = "Content from LinkedIn";
    return defaultInfo;
  }

  return {
    url,
    title: title || "LinkedIn Post",
    domain,
    description: description || "Content from LinkedIn",
  };
}

/**
 * Creates a Twitter/X specific content parser
 * @param html The HTML content
 * @param url The original URL
 * @returns Scraped information or null
 */
function parseTwitterContent(html: string, url: string, domain: string): ScrapedUrlInfo | null {
  // Extract title (Twitter specific patterns)
  const title = extractMetaContent(html, ["og:title", "twitter:title"]);

  // Extract description
  const description = extractMetaContent(html, ["og:description", "twitter:description", "description"]);

  // If no metadata found, use Twitter-specific default
  if (!title && !description) {
    const defaultInfo = createDefaultUrlInfo(url, domain);
    defaultInfo.title = "Tweet";
    defaultInfo.description = "Content from Twitter/X";
    return defaultInfo;
  }

  return {
    url,
    title: title || "Tweet",
    domain,
    description: description || "Content from Twitter/X",
  };
}

/**
 * Enhanced function to get metadata from URLs, with special handling for different platforms
 * This doesn't parse the full content but gets metadata from the request
 * @param url The URL to analyze
 * @returns Basic information about the URL
 */
export async function getUrlMetadata(url: string): Promise<ScrapedUrlInfo | null> {
  try {
    // Extract domain first - used throughout
    let domain = "";
    try {
      const urlObj = new URL(url);
      domain = urlObj.hostname.replace(/^www\./, "");
    } catch {
      domain = "Unknown Domain";
    }

    // Create realistic browser headers to avoid bot detection
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "cross-site",
      "Sec-Fetch-User": "?1",
      Pragma: "no-cache",
      "Cache-Control": "no-cache",
    };

    // Check for special domains that might need custom handling
    const isTwitter = domain.includes("twitter.com") || domain.includes("x.com");
    const isLinkedIn = domain.includes("linkedin.com");

    // If it's a special site and we decide to use a custom approach
    if (isTwitter || isLinkedIn) {
      try {
        // Make the fetch request
        const response = await fetch(url, { method: "GET", headers });

        // Check response and get HTML
        if (!response.ok) {
          return createDefaultUrlInfo(url, domain);
        }

        const html = await response.text();

        // Use specialized parsers based on the domain
        if (isTwitter) {
          return parseTwitterContent(html, url, domain);
        } else if (isLinkedIn) {
          return parseLinkedInContent(html, url, domain);
        }
      } catch (specialError) {
        console.error("Error in specialized fetch:", specialError);
        return createDefaultUrlInfo(url, domain);
      }
    }

    // Standard approach for other sites
    const response = await fetch(url, { method: "GET", headers });

    // If the fetch failed, return custom default
    if (!response.ok) {
      return createDefaultUrlInfo(url, domain);
    }

    // Check content type
    const contentType = response.headers.get("content-type") || "";

    // For non-HTML content, return simple info
    if (!contentType.includes("text/html")) {
      return {
        url,
        title: `${domain} (${contentType.split(";")[0]})`,
        domain,
        description: `Non-HTML content: ${contentType}`,
      };
    }

    // Get HTML text
    const html = await response.text();

    // Try to extract title with multiple patterns
    let title = null;

    // First try meta tags
    title = extractMetaContent(html, ["og:title", "twitter:title"]);

    // If no meta title, try HTML title tag
    if (!title) {
      const titleRegex = /<title[^>]*>(.*?)<\/title>/is;
      const titleMatch = titleRegex.exec(html);
      title = titleMatch ? titleMatch[1].trim() : null;
    }

    // Extract description with multiple patterns
    const description = extractMetaContent(html, [
      "og:description",
      "description",
      "twitter:description",
      "DC.description",
      "article:description",
    ]);

    // If basic extraction failed, try more aggressive approaches
    if (!title && !description) {
      // Try h1 tags for title
      const h1Regex = /<h1[^>]*>(.*?)<\/h1>/is;
      const h1Match = h1Regex.exec(html);
      title = h1Match ? h1Match[1].replace(/<[^>]*>/g, "").trim() : null;

      // If still no title, use domain as title
      if (!title) {
        title = domain;
      }
    }

    return {
      url,
      title: title || domain,
      domain,
      description: description || `Content from ${domain}`,
    };
  } catch (error) {
    console.error("Error fetching URL metadata:", error);

    // Try to extract domain for fallback
    let domain = "Unknown Site";
    try {
      const urlObj = new URL(url);
      domain = urlObj.hostname.replace(/^www\./, "");
    } catch {
      // Keep default domain
    }

    return createDefaultUrlInfo(url, domain);
  }
}
