enum CommandType {
  Fix = "Fix grammer",
  Paraphrase = "Paraphrase",
  ToneChange = "Change Tone",
  ContinueText = "Continue Text",
}

enum ToneType {
  Professional = "Professional",
  Friendly = "Friendly",
  Romantic = "Romantic",
  Happy = "Happy",
  Sad = "Sad",
  Sarcastic = "Sarcastic",
  Angry = "Angry",
}

export type State = {
  command: CommandType;
  toneType: ToneType;
  isLoading: boolean;
  chat: Chat;
};

export interface Chat {
  question: string;
  answer: string;
  id: string;
  created_at: string;
}

export interface SavedChat extends Chat {
  saved_at?: string;
}

export { CommandType, ToneType };
