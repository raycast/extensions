import { Detail, List } from "@raycast/api";
import { SnippetsLab } from "../hooks/useSnippetsLab";
import type { Snippet } from "../models/snippet";
import { SnippetActions } from "./actions";

/**
 * Max snippet content length, in utf-16 code units, to render in a details view. This is limited
 * because Markdown rendering in Raycast appears to take superlinear time and blocks the UI thread
 * while rendering.
 */
const DETAILS_LIMIT = 10_000;

interface SnippetDetailsProps {
    app: SnippetsLab;
    snippet: Snippet;
}

/**
 * Details view for a snippet.
 *
 * If the snippet has multiple fragments, this shows a master-detail style list of each fragment.
 * Otherwise, it shows the content of the suggested fragment matching the search query.
 */
export function SnippetDetails({ app, snippet }: SnippetDetailsProps) {
    if (snippet.fragments.length > 1) {
        return (
            <List
                navigationTitle={snippet.title}
                searchBarPlaceholder={snippet.title}
                isShowingDetail
            >
                {snippet.fragments.map((fragment) => (
                    <List.Item
                        key={fragment.uuid}
                        title={fragment.title}
                        detail={<List.Item.Detail markdown={fragment.getMarkdown(DETAILS_LIMIT)} />}
                        actions={<SnippetActions app={app} snippet={snippet} fragment={fragment} />}
                    />
                ))}
            </List>
        );
    } else {
        return (
            <Detail
                navigationTitle={snippet.title}
                markdown={snippet.suggestedFragment.getMarkdown(DETAILS_LIMIT)}
                actions={<SnippetActions app={app} snippet={snippet} />}
            />
        );
    }
}
