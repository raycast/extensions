import ts from "typescript";

export const SOURCE_OWNER = "serser322";
export const SOURCE_REPOSITORY = "ave-mujica-images";
export const SOURCE_WEBSITE_URL = "https://ave-mujica-images.pages.dev";
export const SOURCE_REPOSITORY_URL = `https://github.com/${SOURCE_OWNER}/${SOURCE_REPOSITORY}`;
export const SOURCE_STATE_PATH = "src/layout/contentLayoutSlice.ts";

export const SERIES = Object.freeze([
  {
    id: "mygo",
    title: "MyGO!!!!!",
    assetDirectory: "mygo",
    sourceStateKey: "myGOImages",
    order: 0,
  },
  {
    id: "ave-mujica",
    title: "Ave Mujica",
    assetDirectory: "ave-mujica",
    sourceStateKey: "aveMujicaImages",
    order: 1,
  },
]);

export function encodeRepositoryPath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

export function rawGitHubUrl(commit, path) {
  return `https://raw.githubusercontent.com/${SOURCE_OWNER}/${SOURCE_REPOSITORY}/${commit}/${encodeRepositoryPath(path)}`;
}

export function displayTitle(rawName) {
  return rawName.replace(/_\d+$/, "").trimEnd();
}

function propertyName(node) {
  if (!node) return undefined;
  if (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) return node.text;
  return undefined;
}

function findInitialState(sourceFile) {
  let initializer;

  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "initialState" &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      initializer = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  if (!initializer) throw new Error(`Could not find the initialState object in ${SOURCE_STATE_PATH}`);
  return initializer;
}

function getObjectProperty(object, name) {
  return object.properties.find(
    (property) => ts.isPropertyAssignment(property) && propertyName(property.name) === name,
  );
}

function readScreenshotArray(initialState, series) {
  const property = getObjectProperty(initialState, series.sourceStateKey);
  if (!property || !ts.isPropertyAssignment(property) || !ts.isArrayLiteralExpression(property.initializer)) {
    throw new Error(`Could not find array initialState.${series.sourceStateKey}`);
  }

  return property.initializer.elements.map((element, index) => {
    if (!ts.isObjectLiteralExpression(element)) {
      throw new Error(`${series.sourceStateKey}[${index}] is not an object literal`);
    }

    const nameProperty = getObjectProperty(element, "name");
    const episodeProperty = getObjectProperty(element, "episode");
    const nameInitializer =
      nameProperty && ts.isPropertyAssignment(nameProperty) ? nameProperty.initializer : undefined;
    const episodeInitializer =
      episodeProperty && ts.isPropertyAssignment(episodeProperty) ? episodeProperty.initializer : undefined;

    if (!nameInitializer || !ts.isStringLiteralLike(nameInitializer)) {
      throw new Error(`${series.sourceStateKey}[${index}].name is not a string literal`);
    }
    if (!episodeInitializer || !ts.isNumericLiteral(episodeInitializer)) {
      throw new Error(`${series.sourceStateKey}[${index}].episode is not a number literal`);
    }

    return {
      rawName: nameInitializer.text,
      episode: Number(episodeInitializer.text),
    };
  });
}

export function parseSourceState(sourceText) {
  const sourceFile = ts.createSourceFile(SOURCE_STATE_PATH, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const initialState = findInitialState(sourceFile);
  return new Map(SERIES.map((series) => [series.id, readScreenshotArray(initialState, series)]));
}

export function buildManifest({ commit, sourceText, treePaths }) {
  if (!/^[0-9a-f]{40}$/i.test(commit)) throw new Error(`Invalid source commit: ${commit}`);

  const parsedSeries = parseSourceState(sourceText);
  const availablePaths = new Set(treePaths);
  const screenshots = [];
  const screenshotsById = new Map();
  const missingPaths = [];

  for (const series of [...SERIES].sort((left, right) => left.order - right.order)) {
    const items = parsedSeries.get(series.id);
    if (!items) throw new Error(`No source data found for series ${series.id}`);

    for (const item of items) {
      const webpPath = `src/assets/webp/${series.assetDirectory}/${item.rawName}.webp`;
      const jpgPath = `src/assets/jpg/${series.assetDirectory}/${item.rawName}.jpg`;
      if (!availablePaths.has(webpPath)) missingPaths.push(webpPath);
      if (!availablePaths.has(jpgPath)) missingPaths.push(jpgPath);

      const screenshot = {
        id: `${series.id}/${item.rawName}`,
        seriesId: series.id,
        rawName: item.rawName,
        title: displayTitle(item.rawName),
        episode: item.episode,
        previewUrl: rawGitHubUrl(commit, webpPath),
        copyUrl: rawGitHubUrl(commit, jpgPath),
      };
      const existing = screenshotsById.get(screenshot.id);
      if (existing) {
        if (existing.episode !== screenshot.episode) {
          throw new Error(
            `The source metadata assigns ${screenshot.id} to episodes ${existing.episode} and ${screenshot.episode}`,
          );
        }
        continue;
      }
      screenshotsById.set(screenshot.id, screenshot);
      screenshots.push(screenshot);
    }
  }

  if (missingPaths.length > 0) {
    const preview = missingPaths
      .slice(0, 20)
      .map((path) => `- ${path}`)
      .join("\n");
    const remainder = missingPaths.length > 20 ? `\n...and ${missingPaths.length - 20} more` : "";
    throw new Error(`Upstream metadata references missing assets:\n${preview}${remainder}`);
  }

  return {
    schemaVersion: 1,
    sourceCommit: commit,
    sourceWebsiteUrl: SOURCE_WEBSITE_URL,
    sourceRepositoryUrl: SOURCE_REPOSITORY_URL,
    series: SERIES.map((series) => ({ ...series })),
    screenshots,
  };
}
