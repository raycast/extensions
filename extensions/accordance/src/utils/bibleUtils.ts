import { BibleData, BibleBook } from "../components/BibleData";

export interface Reference {
  book: string;
  chapter: number;
  verse: number;
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

  // Try exact match first
  let match = BibleData.find((b) => b.name.toLowerCase() === normalizedInput);
  if (match) return match;

  // Try prefix matching (handles abbreviations like "1 cor" -> "1 Corinthians")
  match = BibleData.find((b) => b.name.toLowerCase().startsWith(normalizedInput));
  if (match) return match;

  // Try if input matches start of any word in book name (handles "1cor" -> "1 Corinthians")
  match = BibleData.find((b) => {
    const bookWords = b.name.toLowerCase().split(" ");
    return bookWords.some((word) => word.startsWith(normalizedInput));
  });
  if (match) return match;

  // Try contains matching as last resort
  match = BibleData.find((b) => b.name.toLowerCase().includes(normalizedInput));
  return match || null;
};

// Parse reference from string like "John 3:16", "John 3.16", "John 3", or just "John"
export const parseReference = (ref: string): Reference | null => {
  const trimmedRef = ref.trim();

  // Try to match with chapter and/or verse first
  const fullMatch = trimmedRef.match(/^(.+?)\s+(\d+)(?:[:.](\d+))?$/);
  if (fullMatch) {
    const [, book, chapter, verse] = fullMatch;
    const parsedRef = {
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
