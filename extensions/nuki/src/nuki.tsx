import { Action, ActionPanel, List, closeMainWindow, getPreferenceValues } from '@raycast/api';
import { useFetch } from '@raycast/utils';
import { Preferences, SmartLock } from './nuki-models';
import fetch from 'node-fetch';

export default function Nuki() {
    const preferences = getPreferenceValues<Preferences>();

    const headers = {
        Authorization: `Bearer ${preferences.APIKey}`,
        'Content-Type': 'application/json',
    };

    const { isLoading, data } = useFetch<SmartLock[]>('https://api.nuki.io/smartlock', { headers });

    const openSmartlock = async (smartlockId: number) => {
        await fetch(`https://api.nuki.io/smartlock/${smartlockId}/action`, {
            headers,
            method: 'POST',
            body: JSON.stringify({
                action: 3,
                option: 0,
            }),
        });
        closeMainWindow();
    };

    return (
        <List isLoading={ isLoading }>
            { data?.map(({ name, smartlockId }) => (
                <List.Item
                    key={ smartlockId }
                    icon="list-item-icon.png"
                    title={ name }
                    actions={
                        <ActionPanel>
                            <Action title={ `Open ${name}`} onAction={ () => openSmartlock(smartlockId) } />
                        </ActionPanel>
                    }
                />
            ))}
        </List>
    )
}