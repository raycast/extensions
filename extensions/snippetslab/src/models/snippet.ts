import { Fragment } from "./fragment";
import type { CLISnippet } from "./response";

export class Snippet {
    readonly fragments: Fragment[];

    constructor(private readonly snippet: CLISnippet) {
        this.fragments = this.snippet.fragments.map((fragment) => new Fragment(fragment));
    }

    get uuid(): string {
        return this.snippet.uuid;
    }

    get title(): string {
        return this.snippet.title;
    }

    get folder(): string {
        return this.snippet.folder;
    }

    get tags(): string[] {
        return this.snippet.tags;
    }

    get languages(): string[] {
        return [...new Set(this.fragments.map((fragment) => fragment.languageName))];
    }

    /** The first fragment that matches the search query. */
    get suggestedFragment(): Fragment {
        return this.fragments[this.snippet.suggestedIndex];
    }

    /** The context window around the first match of the query. */
    get context(): string {
        return this.snippet.context;
    }
}
