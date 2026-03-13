import { SBComponents, StoriesData } from "./types";

export function parseStoriesJson(stories: StoriesData) {
  const components = Object.entries(stories).reduce<SBComponents>((acc, [, story]) => {
    const componentName = story.kind.split("/").pop() as string;

    if (!acc[componentName]) {
      acc[componentName] = {
        name: componentName,
        stories: [],
      };
    }

    if (story.tags.includes("story")) {
      acc[componentName].stories.push(story);
    }

    return acc;
  }, {});

  return components;
}
