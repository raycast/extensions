interface Card {
  question: string;
  answer: string;
  tag: string;
}

interface Preferences {
  dataFile: string;
}

export type { Card, Preferences };
