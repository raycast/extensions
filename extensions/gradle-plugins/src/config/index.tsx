interface Config {
  gradleURL: string;
}

export function getConfig(): Config {
  return {
    gradleURL: "https://plugins.gradle.org",
  };
}
