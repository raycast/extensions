import { Citation, Author } from "./storage";

function formatAuthorAPA(author: Author): string {
  const middleInitial = author.middleName ? ` ${author.middleName.charAt(0)}.` : "";
  return `${author.lastName}, ${author.firstName.charAt(0)}.${middleInitial}`;
}

function formatAuthorMLA(author: Author): string {
  return `${author.lastName}, ${author.firstName}${author.middleName ? ` ${author.middleName}` : ""}`;
}

function formatAuthorChicago(author: Author, isFirst: boolean): string {
  if (isFirst) {
    return `${author.lastName}, ${author.firstName}${author.middleName ? ` ${author.middleName}` : ""}`;
  } else {
    return `${author.firstName}${author.middleName ? ` ${author.middleName}` : ""} ${author.lastName}`;
  }
}

function formatAuthorHarvard(author: Author): string {
  return `${author.lastName}, ${author.firstName.charAt(0)}.${
    author.middleName ? `${author.middleName.charAt(0)}.` : ""
  }`;
}

function formatAuthorsAPA(authors: Author[]): string {
  if (authors.length === 0) return "";
  if (authors.length === 1) return formatAuthorAPA(authors[0]);

  const formattedAuthors = authors.map(formatAuthorAPA);
  const lastAuthor = formattedAuthors.pop();

  if (authors.length <= 7) {
    return `${formattedAuthors.join(", ")}, & ${lastAuthor}`;
  } else {
    return `${formattedAuthors.slice(0, 6).join(", ")}, ... ${lastAuthor}`;
  }
}

function formatAuthorsMLA(authors: Author[]): string {
  if (authors.length === 0) return "";
  if (authors.length === 1) return formatAuthorMLA(authors[0]);
  if (authors.length === 2) {
    return `${formatAuthorMLA(authors[0])}, and ${authors[1].firstName} ${authors[1].lastName}`;
  }
  if (authors.length <= 3) {
    const firstAuthors = authors
      .slice(0, authors.length - 1)
      .map(formatAuthorMLA)
      .join(", ");
    return `${firstAuthors}, and ${authors[authors.length - 1].firstName} ${authors[authors.length - 1].lastName}`;
  }
  return `${formatAuthorMLA(authors[0])}, et al.`;
}

function formatAuthorsChicago(authors: Author[]): string {
  if (authors.length === 0) return "";
  if (authors.length === 1) return formatAuthorChicago(authors[0], true);

  if (authors.length <= 3) {
    const firstAuthor = formatAuthorChicago(authors[0], true);
    const otherAuthors = authors
      .slice(1)
      .map((author) => formatAuthorChicago(author, false))
      .join(" and ");
    return `${firstAuthor}, and ${otherAuthors}`;
  }

  return `${formatAuthorChicago(authors[0], true)}, et al.`;
}

function formatAuthorsHarvard(authors: Author[]): string {
  if (authors.length === 0) return "";
  if (authors.length === 1) return formatAuthorHarvard(authors[0]);

  if (authors.length <= 3) {
    const formattedAuthors = authors.map(formatAuthorHarvard);
    return formattedAuthors.join(", ");
  }

  return `${formatAuthorHarvard(authors[0])} et al.`;
}

function formatDate(dateStr?: string): { year: string; fullDate: string } {
  if (!dateStr) return { year: "n.d.", fullDate: "n.d." };

  try {
    const date = new Date(dateStr);
    return {
      year: date.getFullYear().toString(),
      fullDate: date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    };
  } catch (e) {
    return { year: "n.d.", fullDate: "n.d." };
  }
}

export function formatCitation(citation: Omit<Citation, "formattedCitation">): string {
  switch (citation.citationStyle) {
    case "apa":
      return formatAPA(citation);
    case "mla":
      return formatMLA(citation);
    case "chicago":
      return formatChicago(citation);
    case "harvard":
      return formatHarvard(citation);
    default:
      return formatAPA(citation);
  }
}

function formatAPA(citation: Omit<Citation, "formattedCitation">): string {
  const authors = formatAuthorsAPA(citation.authors);
  const date = formatDate(citation.publicationDate);

  let result = "";

  if (authors) {
    result += authors + " ";
  }

  result += `(${date.year}). `;
  result += `${citation.title}. `;

  if (citation.type === "journal") {
    if (citation.journalName) {
      result += `${citation.journalName}`;
      if (citation.volume) {
        result += `, ${citation.volume}`;
        if (citation.issue) {
          result += `(${citation.issue})`;
        }
      }
      if (citation.pages) {
        result += `, ${citation.pages}`;
      }
      result += ". ";
    }
    if (citation.doi) {
      result += `https://doi.org/${citation.doi}`;
    } else if (citation.url) {
      result += citation.url;
    }
  } else if (citation.type === "website") {
    if (citation.publisher) {
      result += `${citation.publisher}. `;
    }
    if (citation.url) {
      result += citation.url;
    }
  } else if (citation.type === "book") {
    if (citation.publisher) {
      result += `${citation.publisher}.`;
    }
  }

  return result;
}

function formatMLA(citation: Omit<Citation, "formattedCitation">): string {
  const authors = formatAuthorsMLA(citation.authors);

  let result = "";

  if (authors) {
    result += authors + ". ";
  }

  result += `"${citation.title}." `;

  if (citation.type === "journal") {
    if (citation.journalName) {
      result += `${citation.journalName}`;
      if (citation.volume) {
        result += `, vol. ${citation.volume}`;
        if (citation.issue) {
          result += `, no. ${citation.issue}`;
        }
      }
      if (citation.publicationDate) {
        const date = formatDate(citation.publicationDate);
        result += `, ${date.fullDate}`;
      }
      if (citation.pages) {
        result += `, pp. ${citation.pages}`;
      }
      result += ". ";
    }
    if (citation.url) {
      result += `${citation.url}. `;
    }
    if (citation.accessDate) {
      const date = formatDate(citation.accessDate);
      result += `Accessed ${date.fullDate}.`;
    }
  } else if (citation.type === "website") {
    if (citation.publisher) {
      result += `${citation.publisher}, `;
    }
    if (citation.publicationDate) {
      const date = formatDate(citation.publicationDate);
      result += `${date.fullDate}, `;
    }
    if (citation.url) {
      result += `${citation.url}. `;
    }
    if (citation.accessDate) {
      const date = formatDate(citation.accessDate);
      result += `Accessed ${date.fullDate}.`;
    }
  } else if (citation.type === "book") {
    if (citation.publisher) {
      result += `${citation.publisher}, `;
    }
    if (citation.publicationDate) {
      const date = formatDate(citation.publicationDate);
      result += `${date.year}.`;
    }
  }

  return result;
}

function formatChicago(citation: Omit<Citation, "formattedCitation">): string {
  const authors = formatAuthorsChicago(citation.authors);

  let result = "";

  if (authors) {
    result += authors + ". ";
  }

  result += `"${citation.title}." `;

  if (citation.type === "journal") {
    if (citation.journalName) {
      result += `${citation.journalName} `;
      if (citation.volume) {
        result += `${citation.volume}`;
        if (citation.issue) {
          result += `, no. ${citation.issue}`;
        }
      }
      if (citation.publicationDate) {
        const date = formatDate(citation.publicationDate);
        result += ` (${date.year})`;
      }
      if (citation.pages) {
        result += `: ${citation.pages}`;
      }
      result += ". ";
    }
    if (citation.doi) {
      result += `https://doi.org/${citation.doi}.`;
    } else if (citation.url) {
      result += `${citation.url}.`;
    }
  } else if (citation.type === "website") {
    if (citation.publisher) {
      result += `${citation.publisher}. `;
    }
    if (citation.publicationDate) {
      const date = formatDate(citation.publicationDate);
      result += `${date.fullDate}. `;
    }
    if (citation.url) {
      result += `${citation.url}.`;
    }
  } else if (citation.type === "book") {
    if (citation.publisher) {
      result += `${citation.publisher}, `;
    }
    if (citation.publicationDate) {
      const date = formatDate(citation.publicationDate);
      result += `${date.year}.`;
    }
  }

  return result;
}

function formatHarvard(citation: Omit<Citation, "formattedCitation">): string {
  const authors = formatAuthorsHarvard(citation.authors);
  const date = formatDate(citation.publicationDate);

  let result = "";

  if (authors) {
    result += authors + " ";
  }

  result += `${date.year}, `;

  if (citation.type === "journal") {
    result += `'${citation.title}', `;
    if (citation.journalName) {
      result += `${citation.journalName}`;
      if (citation.volume) {
        result += `, vol. ${citation.volume}`;
        if (citation.issue) {
          result += `, no. ${citation.issue}`;
        }
      }
      if (citation.pages) {
        result += `, pp. ${citation.pages}`;
      }
      result += ". ";
    }
    if (citation.doi) {
      result += `DOI: ${citation.doi}`;
    } else if (citation.url) {
      result += `Available at: ${citation.url}`;
      if (citation.accessDate) {
        const accessDate = formatDate(citation.accessDate);
        result += ` (Accessed: ${accessDate.fullDate})`;
      }
    }
  } else if (citation.type === "website") {
    result += `${citation.title} [Online]. `;
    if (citation.publisher) {
      result += `${citation.publisher}. `;
    }
    if (citation.url) {
      result += `Available at: ${citation.url} `;
    }
    if (citation.accessDate) {
      const accessDate = formatDate(citation.accessDate);
      result += `(Accessed: ${accessDate.fullDate})`;
    }
  } else if (citation.type === "book") {
    result += `${citation.title}, `;
    if (citation.publisher) {
      result += `${citation.publisher}.`;
    }
  }

  return result;
}
