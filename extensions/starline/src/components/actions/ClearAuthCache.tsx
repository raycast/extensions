import { Action, Alert, Icon, Toast, confirmAlert, showToast } from "@raycast/api";

import { StarLine } from "../../starline/api";

type ClearAuthCacheActionProps = {
    onCleared?: () => Promise<void> | void;
};

function ClearAuthCacheAction({ onCleared }: ClearAuthCacheActionProps) {
    const handleAction = async () => {
        const confirmed = await confirmAlert({
            title: "Clear StarLine Auth Cache?",
            message: "Cached app/user tokens and SLNet session will be removed. Preferences are not affected.",
            primaryAction: {
                title: "Clear Cache",
                style: Alert.ActionStyle.Destructive,
            },
        });

        if (!confirmed) {
            return;
        }

        await StarLine.clearAuthCache();
        await showToast(Toast.Style.Success, "Auth cache cleared");
        await onCleared?.();
    };

    return <Action title="Clear Auth Cache" icon={Icon.Trash} onAction={handleAction} />;
}

export default ClearAuthCacheAction;
