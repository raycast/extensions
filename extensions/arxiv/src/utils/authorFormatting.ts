// Centralized author formatting utilities to reduce code duplication

// HTML escape function to prevent XSS attacks
export function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
    "/": "&#x2F;",
    "`": "&#x60;",
    "=": "&#x3D;",
  };
  return text.replace(/[&<>"'`=/]/g, (char) => htmlEntities[char] || char);
}

// Common author name parsing
export interface ParsedAuthor {
  firstName: string;
  middleNames: string[];
  lastName: string;
  initials: string;
}

export function parseAuthorName(author: string): ParsedAuthor {
  const escapedAuthor = escapeHtml(author);
  const parts = escapedAuthor.split(" ").filter((part) => part.length > 0);

  if (parts.length === 0) {
    return { firstName: "", middleNames: [], lastName: "Unknown", initials: "" };
  }

  if (parts.length === 1) {
    return { firstName: "", middleNames: [], lastName: parts[0], initials: "" };
  }

  const lastName = parts[parts.length - 1];
  const firstName = parts[0];
  const middleNames = parts.slice(1, -1);
  const initials = parts
    .slice(0, -1)
    .map((name) => name[0].toUpperCase() + ".")
    .join(" ");

  return { firstName, middleNames, lastName, initials };
}

// Format author as "LastName, F.M."
export function formatAuthorLastFirst(author: string): string {
  const { lastName, initials } = parseAuthorName(author);
  return initials ? `${lastName}, ${initials}` : lastName;
}

// Format author as "F.M. LastName"
export function formatAuthorFirstLast(author: string): string {
  const { lastName, initials } = parseAuthorName(author);
  return initials ? `${initials} ${lastName}` : lastName;
}

// Format author with full name (escaped)
export function formatAuthorFull(author: string): string {
  return escapeHtml(author);
}

// Generic author list formatter
export interface AuthorListOptions {
  maxAuthors: number;
  maxDisplay?: number;
  separator?: string;
  lastSeparator?: string;
  etAl?: string;
  formatSingle: (author: string) => string;
  firstAuthorInverted?: boolean;
}

export function formatAuthorList(authors: string[], options: AuthorListOptions): string {
  if (!authors || authors.length === 0) {
    return "Unknown";
  }

  const {
    maxAuthors,
    maxDisplay = maxAuthors,
    separator = ", ",
    lastSeparator = ", and ",
    etAl = ", et al.",
    formatSingle,
    firstAuthorInverted = false,
  } = options;

  // Helper to format author based on position
  const formatAuthor = (author: string, index: number): string => {
    if (index === 0 && firstAuthorInverted) {
      // Format first author as "Last Name, First Name" when inverted
      const parsed = parseAuthorName(author);
      const fullName = [parsed.firstName, ...parsed.middleNames].filter((n) => n).join(" ");
      return fullName ? `${parsed.lastName}, ${fullName}` : parsed.lastName;
    }
    return formatSingle(author);
  };

  if (authors.length === 1) {
    return formatAuthor(authors[0], 0);
  }

  if (authors.length === 2) {
    return `${formatAuthor(authors[0], 0)} and ${formatAuthor(authors[1], 1)}`;
  }

  // Check if we need to use et al.
  const needsEtAl = authors.length > maxAuthors || (maxDisplay < authors.length && maxDisplay < maxAuthors);

  if (!needsEtAl) {
    // Show all authors
    const formatted = authors.map((author, index) => formatAuthor(author, index));
    return formatted.slice(0, -1).join(separator) + lastSeparator + formatted[formatted.length - 1];
  }

  // Need et al.
  const numToShow = maxDisplay < maxAuthors ? maxDisplay : 1;
  const formatted = authors.slice(0, numToShow).map((author, index) => formatAuthor(author, index));
  return formatted.join(separator) + etAl;
}
