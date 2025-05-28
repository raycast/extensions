import type { CLIFragment } from "./response";

export class Fragment {
    constructor(private readonly fragment: CLIFragment) {}

    get uuid(): string {
        return this.fragment.uuid;
    }

    /**
     * Title of the fragment.
     *
     * For snippets with only a single fragment, this name is likely generic (such as "Fragment")
     * and cannot be set or seen by the user in the SnippetsLab app.
     */
    get title(): string {
        return this.fragment.title;
    }

    /** Display name of the language, for example "C++". */
    get languageName(): string {
        return this.fragment.languageName;
    }

    /**
     * Alias of the language, for example "cpp".
     *
     * This is often the name to use in Markdown code blocks, vim and emacs mode lines, etc.
     */
    get languageAlias(): string {
        return this.fragment.languageAlias;
    }

    /** Unique lexer identifier of the language, for example "CppLexer". */
    get languageID(): string {
        return this.fragment.languageID;
    }

    get note(): string {
        return this.fragment.note;
    }

    get content(): string {
        return this.fragment.content;
    }

    /** The contents of the fragment in Markdown, limited to the given length. */
    getMarkdown(maxLength?: number): string {
        let content = this.content;

        // TODO: `substring` does not handle unicode composed characters correctly.
        if (maxLength && content.length > maxLength) {
            content = content.substring(0, maxLength) + "…";
        }

        if (this.languageID === "MarkdownLexer") {
            return content;
        } else {
            return "```" + this.languageAlias + "\n" + content + "\n```";
        }
    }
}
