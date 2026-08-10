import type { ItemDefinition } from "./learning-item";

export enum TrainingType {
  QUIZ = "QUIZ",
  QUIZ_REVERSE = "QUIZ_REVERSE",
  WRITING = "WRITING",
  SPEAKING = "SPEAKING",
  LISTENING = "LISTENING",
  WRITING_SELECTION = "WRITING_SELECTION",
  FLASHCARD = "FLASHCARD",
  MATCHING_LEARNING_ITEM_DEFINITION = "MATCHING_LEARNING_ITEM_DEFINITION",
  MATCHING_LEARNING_ITEM_LISTENING = "MATCHING_LEARNING_ITEM_LISTENING",
}

export interface GenerateTrainingRequest {
  groupIds?: string[];
  learningItemIds?: string[];
  trainingTypes?: TrainingType[];
  excludedTrainingTypes?: TrainingType[];
}

export interface LearningItemDefinitionIdentifier {
  learningItemId: string;
  definitionId?: string;
}

export interface GenericTrainingResultItem {
  question: LearningItemDefinitionIdentifier;
  answers: LearningItemDefinitionIdentifier[];
  trainingType?: TrainingType;
}

export interface GenericTrainingResult {
  items: GenericTrainingResultItem[];
  trainingType?: TrainingType;
}

// Quiz
export interface QuizOption {
  learningItemId: string;
  definition: ItemDefinition;
  answer: boolean;
}

export interface QuizTrainingItem {
  learningItemId: string;
  text: string;
  comment?: string;
  imageUrl?: string;
  speechUrl?: string;
  options: QuizOption[];
}

// Quiz Reverse
export interface QuizReverseOption {
  learningItemId: string;
  text: string;
  speechUrl?: string;
  answer: boolean;
}

export interface QuizReverseTrainingItem {
  learningItemId: string;
  definition: ItemDefinition;
  imageUrl?: string;
  speechUrl?: string;
  options: QuizReverseOption[];
}

// Flashcard
export interface FlashcardTrainingItem {
  learningItemId: string;
  language: string;
  text: string;
  comment?: string;
  imageUrl?: string;
  speechUrl?: string;
  definitions?: ItemDefinition[];
  groupIds?: string[];
}

// Writing Selection
export interface WritingSelectionTrainingItem {
  learningItemId: string;
  text: string;
  comment?: string;
  imageUrl?: string;
  speechUrl?: string;
  definition: ItemDefinition;
  options: string[];
  answer: string[];
}

// Writing
export interface WritingTrainingItem {
  learningItemId: string;
  text: string;
  comment?: string;
  imageUrl?: string;
  speechUrl?: string;
  definition: ItemDefinition;
}

// Speaking
export interface SpeakingTrainingItem {
  learningItemId: string;
  text: string;
  comment?: string;
  imageUrl?: string;
  speechUrl?: string;
  definitions?: ItemDefinition[];
}

// Listening
export interface ListeningOption {
  learningItemId: string;
  text: string;
  imageUrl?: string;
  speechUrl?: string;
}

export interface ListeningTrainingItem {
  learningItemId: string;
  text: string;
  comment?: string;
  imageUrl?: string;
  speechUrl?: string;
  definitions?: ItemDefinition[];
  options: ListeningOption[];
}

// Matching Definition
export interface MatchingDefinitionItem {
  learningItemId: string;
  definitionId?: string;
  definition?: string;
  translation?: string;
  comment?: string;
  examples?: string[];
}

export interface MatchingLearningItemText {
  learningItemId: string;
  text: string;
}

export interface MatchingDefinitionTrainingItem {
  definitions: MatchingDefinitionItem[];
  learningItems: MatchingLearningItemText[];
  definitionsOnLeft: boolean;
}

// Matching Listening
export interface MatchingLearningItemListening {
  learningItemId: string;
  text: string;
  speechUrl?: string;
}

export interface MatchingListeningTrainingItem {
  definitions: MatchingDefinitionItem[];
  learningItems: MatchingLearningItemListening[];
  definitionsOnLeft: boolean;
}

// Mixed Training Item (discriminated union)
export type MixedTrainingItem =
  | { trainingType: TrainingType.QUIZ; payload: QuizTrainingItem }
  | {
      trainingType: TrainingType.QUIZ_REVERSE;
      payload: QuizReverseTrainingItem;
    }
  | { trainingType: TrainingType.FLASHCARD; payload: FlashcardTrainingItem }
  | {
      trainingType: TrainingType.WRITING_SELECTION;
      payload: WritingSelectionTrainingItem;
    }
  | { trainingType: TrainingType.WRITING; payload: WritingTrainingItem }
  | { trainingType: TrainingType.SPEAKING; payload: SpeakingTrainingItem }
  | { trainingType: TrainingType.LISTENING; payload: ListeningTrainingItem }
  | {
      trainingType: TrainingType.MATCHING_LEARNING_ITEM_DEFINITION;
      payload: MatchingDefinitionTrainingItem;
    }
  | {
      trainingType: TrainingType.MATCHING_LEARNING_ITEM_LISTENING;
      payload: MatchingListeningTrainingItem;
    };

export interface MixedTraining {
  items: MixedTrainingItem[];
}
