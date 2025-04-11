export interface FlashcardRecord {
  vocabulary: string;
  translation: string;
  lastReviewed?: string;
  proficiency: number; // 0-5 熟悉度等級
}
