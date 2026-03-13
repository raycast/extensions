export interface Preferences {
  url: string;
}

export interface Story {
  id: string;
  title: string;
  name: string;
  tags: string[];
  kind: string;
}

export interface StoriesData {
  [key: string]: Story;
}

export interface SBComponent {
  name: string;
  stories: Story[];
}

export interface SBComponents {
  [key: string]: SBComponent;
}

export interface Storybook {
  id: string;
  name: string;
  url: string;
}
