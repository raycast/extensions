import { Icon } from "@raycast/api";
import { Label } from "../types/label";
import { Snippet } from "../types/snippet";
import { SnippetsResponse } from "../types/snippets-response";
import { COLORS } from "../constants/colors";
import { SnippetFile } from "../types/snippet-file";
import { format } from "date-fns";

export type SnippetWithLibrary = Snippet & { libraryGuid: string; libraryName: string; teamGuid?: string };

export function getSnippets(response: SnippetsResponse | undefined): SnippetWithLibrary[] {
  if (!response) return [];

  let snippets: SnippetWithLibrary[] = [
    ...response.personalLibrary.snippets.map((snippet) => ({
      ...snippet,
      libraryGuid: response.personalLibrary.guid,
      libraryName: "personal",
    })),
  ];

  response.teams.forEach((team) => {
    snippets = snippets.concat([
      ...team.library.snippets.map((snippet) => ({
        ...snippet,
        libraryGuid: team.library.guid,
        libraryName: team.name,
        teamGuid: team.guid,
      })),
    ]);
  });

  return snippets;
}

function getAllLabels(response: SnippetsResponse | undefined) {
  const labels: Label[] = [];
  if (!response) {
    return labels;
  }

  response.personalLibrary.labels.forEach((label) => labels.push(label));
  response.teams.forEach((team) => team.library.labels.forEach((label) => labels.push(label)));
  return labels;
}

export function getLabelsForSnippet(response: SnippetsResponse | undefined, snippet: Snippet) {
  if (!response) return [];

  const labels = getAllLabels(response);
  const labelsForSnippet = labels.filter((label) => label.snippets.some((s) => s.guid === snippet.guid));
  return labelsForSnippet;
}

export function labelColor(label: Label) {
  return label.color === null || label.color === "" ? `#${COLORS[label.colorKey]}` : `#${label.color}`;
}

export function labelIcon(label: Label) {
  const color = labelColor(label);

  return {
    source: Icon.CircleFilled,
    tintColor: {
      light: color,
      dark: color,
      adjustContrast: true,
    },
  };
}

// Decorate file with snippet for easy retrieval
export type SnippetFileWithSnippet = SnippetFile & { snippet: SnippetWithLibrary };

export function snippetFiles(snippets: SnippetWithLibrary[]): SnippetFileWithSnippet[] {
  return snippets.reduce((files: SnippetFileWithSnippet[], snippet) => {
    if (snippet.files.length > 0) {
      files.push(...snippet.files.map((file) => ({ ...file, snippet })));
    }
    return files;
  }, []);
}

export function snippetCreatedBy(snippet: Snippet) {
  const user = snippet.createdBy;
  const name = user.name;
  const nickname = user.nickname;

  if (name?.trim() !== "") {
    return name;
  } else if (nickname?.trim() !== "") {
    return nickname;
  } else {
    return user.email;
  }
}

export function snippetCreatedAt(snippet: Snippet) {
  return format(new Date(snippet.createdAt), "M/dd/yyyy, h:mm a");
}
