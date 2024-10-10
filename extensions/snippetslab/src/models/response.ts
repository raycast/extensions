export interface CLISearchJSONResponse {
    snippets: CLISnippet[];
}

export interface CLISnippet {
    uuid: string;
    title: string;
    folder: string;
    tags: string[];
    fragments: CLIFragment[];
    suggestedIndex: number;
    context: string;
}

export interface CLIFragment {
    uuid: string;
    title: string;
    note: string;
    content: string;
    languageID: string;
    languageName: string;
    languageAlias: string;
}

export interface CLIListFiltersResponse {
    folders: CLIFilter[];
    tags: CLIFilter[];
    languages: CLIFilter[];
}

export interface CLIFilter {
    id: string;
    name: string;
    count: number;
}
