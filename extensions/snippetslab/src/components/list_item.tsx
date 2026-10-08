import { Icon, List } from "@raycast/api";
import { SnippetsLab } from "../hooks/useSnippetsLab";
import { getPreferences } from "../models/preferences";
import type { Snippet } from "../models/snippet";
import { SnippetActions } from "./actions";

interface SnippetListItemProps {
    app: SnippetsLab;
    snippet: Snippet;
}

/** A list item in the search result. */
export function SnippetListItem({ app, snippet }: SnippetListItemProps) {
    const preferences = getPreferences();
    const accessories = [];

    if (preferences.showTags && snippet.tags.length > 0) {
        accessories.push({ text: snippet.tags.join(", "), icon: Icon.Tag });
    }

    if (preferences.showLanguages && snippet.languages.length > 0) {
        accessories.push({ text: snippet.languages.join(", "), icon: Icon.Code });
    }

    if (preferences.showFolder && snippet.folder) {
        accessories.push({ text: snippet.folder, icon: Icon.Folder });
    }

    return (
        <List.Item
            key={snippet.uuid}
            title={snippet.title}
            subtitle={preferences.showSearchContext ? snippet.context : undefined}
            accessories={accessories}
            actions={<SnippetActions app={app} snippet={snippet} allowsPush />}
        />
    );
}
