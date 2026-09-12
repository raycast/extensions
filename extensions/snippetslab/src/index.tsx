import { LaunchProps, List } from "@raycast/api";
import { InitError } from "./components/init_error";
import { useSnippetsLab } from "./hooks/useSnippetsLab";
import { SnippetsSearch } from "./search";

/** Entry point for the Search in SnippetsLab command. */
export default function Command({ fallbackText }: LaunchProps) {
    const { isInitializing, initializationError, appVersion, app } = useSnippetsLab();

    if (isInitializing) {
        return <List isLoading />;
    } else if (initializationError) {
        return <InitError error={initializationError} appVersion={appVersion} />;
    } else {
        return <SnippetsSearch app={app} searchText={fallbackText} />;
    }
}
