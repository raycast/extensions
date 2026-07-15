import { bibleData, BibleBook } from "../components/bibleData";

export interface Reference {
  book: string;
  chapter: number;
  verse: number;
  endVerse?: number;
}

// Function to clean verse text by removing extra spaces
export const cleanVerseText = (text: string): string => {
  return text
    .trim() // Remove leading/trailing whitespace
    .replace(/\s+/g, " "); // Replace multiple consecutive spaces with single space
};

// Normalize Bible reference capitalization
export const normalizeReference = (ref: string): string => {
  return ref
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/(\d+)[:.](\d+)/g, "$1:$2"); // Ensure chapter:verse format
};

export const findBookData = (bookName: string): BibleBook | null => {
  const normalizedInput = bookName.toLowerCase().trim();

  // Try exact name match first
  let match = bibleData.find((b) => b.name.toLowerCase() === normalizedInput);
  if (match) return match;

  // Check abbreviations from the data
  match = bibleData.find((b) => b.abbrvs.some((abbr) => abbr.toLowerCase() === normalizedInput));
  if (match) return match;

  // Try prefix matching (handles partial names)
  match = bibleData.find((b) => b.name.toLowerCase().startsWith(normalizedInput));
  if (match) return match;

  // Try if input matches start of any word in book name (handles "1cor" -> "1 Corinthians")
  match = bibleData.find((b) => {
    const bookWords = b.name.toLowerCase().split(" ");
    return bookWords.some((word) => word.startsWith(normalizedInput));
  });
  if (match) return match;

  // Try contains matching as last resort
  match = bibleData.find((b) => b.name.toLowerCase().includes(normalizedInput));
  return match || null;
};

// Parse reference from string like "John 3:16", "John 3.16", "John 3:16-18", "John 3", or just "John"
export const parseReference = (ref: string): Reference | null => {
  const trimmedRef = ref.trim();

  // Try to match range format first: "Book Ch:V1-V2" or "Book Ch.V1-V2"
  const rangeMatch = trimmedRef.match(/^(.+?)\s+(\d+)[:.](\d+)\s*-\s*(\d+)$/);
  if (rangeMatch) {
    const [, book, chapter, startVerse, endVerse] = rangeMatch;
    const parsedRef: Reference = {
      book: book.trim(),
      chapter: parseInt(chapter),
      verse: parseInt(startVerse),
      endVerse: parseInt(endVerse),
    };

    const bookData = findBookData(parsedRef.book);
    if (!bookData) return null;

    if (parsedRef.chapter < 1 || parsedRef.chapter > bookData.chapters) return null;

    const maxVersesInChapter = bookData.verses[parsedRef.chapter - 1];
    if (parsedRef.verse < 1 || parsedRef.verse > maxVersesInChapter) return null;
    if (parsedRef.endVerse! < parsedRef.verse || parsedRef.endVerse! > maxVersesInChapter) return null;

    return parsedRef;
  }

  // Try to match with chapter and/or verse: "Book Ch:V" or "Book Ch"
  const fullMatch = trimmedRef.match(/^(.+?)\s+(\d+)(?:[:.](\d+))?$/);
  if (fullMatch) {
    const [, book, chapter, verse] = fullMatch;
    const parsedRef: Reference = {
      book: book.trim(),
      chapter: parseInt(chapter),
      verse: verse ? parseInt(verse) : 1,
    };

    // Validate that the reference exists in our Bible data
    const bookData = findBookData(parsedRef.book);
    if (!bookData) return null;

    if (parsedRef.chapter < 1 || parsedRef.chapter > bookData.chapters) return null;

    const maxVersesInChapter = bookData.verses[parsedRef.chapter - 1];
    if (parsedRef.verse < 1 || parsedRef.verse > maxVersesInChapter) return null;

    return parsedRef;
  }

  // If no numbers found, treat the whole string as a book name and start at chapter 1, verse 1
  if (trimmedRef.length > 0) {
    const bookData = findBookData(trimmedRef);
    if (bookData) {
      return {
        book: trimmedRef,
        chapter: 1,
        verse: 1,
      };
    }
  }

  return null;
};

// Validate a reference and return validation result with error message
export const validateReference = (ref: string): { isValid: boolean; error?: string; reference?: Reference } => {
  const parsed = parseReference(ref);
  if (!parsed) {
    return {
      isValid: false,
      error: `Invalid Bible reference: "${ref}". Please enter a valid reference like "John 3:16" or "Genesis 1".`,
    };
  }
  return { isValid: true, reference: parsed };
};

// Validate that a reference contains a valid book name (used for ranges and complex references)
// This is more permissive and lets Accordance handle the detailed parsing
export const validateReferenceFormat = (ref: string): { isValid: boolean; error?: string } => {
  const trimmedRef = ref.trim();
  if (!trimmedRef) {
    return {
      isValid: false,
      error: 'Please enter a Bible reference like "John 3:16" or "1 Cor 1:1-2".',
    };
  }

  // Extract the book name (everything before chapter number)
  // Handles books like "1 Kings" or "2 Corinthians" that start with numbers
  const bookMatch = trimmedRef.match(/^(.+?)\s+\d+/);
  if (!bookMatch) {
    // If no chapter number found, treat the whole thing as a book name
    const bookData = findBookData(trimmedRef);
    if (!bookData) {
      return {
        isValid: false,
        error: `Book "${trimmedRef}" not found. Please enter a valid Bible book name.`,
      };
    }
    return { isValid: true };
  }

  const bookName = bookMatch[1].trim();
  const bookData = findBookData(bookName);
  if (!bookData) {
    return {
      isValid: false,
      error: `Book "${bookName}" not found. Please enter a valid Bible book name.`,
    };
  }

  return { isValid: true };
};
