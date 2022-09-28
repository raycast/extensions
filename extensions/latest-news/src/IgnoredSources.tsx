import { List, LocalStorage, Icon, Color, ActionPanel, Action, useNavigation } from '@raycast/api';
import { useEffect, useState } from 'react';

export default function Command() {
    const { pop } = useNavigation();
    const [ignored, setIgnored] = useState<string[]>([]);
    const [update, setUpdate] = useState<number>(0);

    useEffect(() => {
        LocalStorage.allItems().then((items) => {
            setIgnored(Object.keys(items));
        });
    }, [update]);

    const enableSource = (ignored: string) => {
        LocalStorage.removeItem(ignored).then(() => {
            setUpdate(update + 1);
        });
    };

    return (
        <List navigationTitle="Latest News">
            {ignored.map((ignored, idx) => (
                <List.Item
                    key={idx}
                    icon={{ source: Icon.Trash, tintColor: Color.Red }}
                    title={ignored}
                    detail={<List.Item.Detail isLoading={true} />}
                    actions={
                        <ActionPanel>
                            <Action
                                icon={{ source: Icon.Clipboard, tintColor: Color.PrimaryText }}
                                title={`Delete`}
                                onAction={() => enableSource(ignored)}
                            />
                        </ActionPanel>
                    }
                />
            ))}
        </List>
    );
}
