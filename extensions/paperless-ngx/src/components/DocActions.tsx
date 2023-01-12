import {Action, ActionPanel, getPreferenceValues} from '@raycast/api';
import {DocItem} from '../models/docItem.model';
import {Preferences} from '../models/preferences.model';

const {paperlessURL}: Preferences = getPreferenceValues();

export const DocActions = ({document}: DocItem): JSX.Element => {

    return (
        <ActionPanel>
            <Action.OpenInBrowser
                url={`${paperlessURL}/documents/${document.id}`}
                title="Open in editor"
            />
            <Action.OpenInBrowser
                url={`${paperlessURL}/documents/${document.id}/preview`}
                title="Open file in browser"
            />
            <Action.CopyToClipboard
                content={`${paperlessURL}/documents/${document.id}/preview`}
                title="Copy file URL to clipboard"
            />
        </ActionPanel>
    );
};