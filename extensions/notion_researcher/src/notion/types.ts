export enum Status {
  NotRead = "Not read",
  InProgress = "In progress",
  Read = "Read",
}

export interface PageProperties {
  Title: {
    title: Array<{
      plain_text: string;
    }>;
  };
}

export interface Page {
  id: string;
  properties: PageProperties;
  icon: {
    emoji: string;
  };
}

export interface ParsedPage {
  id: string;
  title: string;
  icon: string;
}
