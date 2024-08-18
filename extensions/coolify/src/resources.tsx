import { Action, ActionPanel, Detail, Icon, List, openExtensionPreferences } from "@raycast/api";
import { getResourceColor, isValidCoolifyUrl } from "./lib/utils";
import useCoolify from "./lib/use-coolify";
import { ResourceDetails } from "./lib/types";
import { COOLIFY_URL } from "./lib/config";

export default function Servers() {
    if (!isValidCoolifyUrl()) return <Detail markdown={`# ERROR \n\n Please make sure Coolify URL is valid`} actions={<ActionPanel>
        <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
    </ActionPanel>} />

    const { isLoading, data: resources = [] } = useCoolify<ResourceDetails[]>("resources");

    return <List isLoading={isLoading} searchBarPlaceholder="Search resource">
        {(!isLoading && !resources.length) ? <List.EmptyView title="No resources found." description="Go online to add a resource." actions={<ActionPanel>
            <Action.OpenInBrowser icon={Icon.Plus} title="Add Resource" url={new URL("servers", COOLIFY_URL).toString()} />
        </ActionPanel>} /> : resources.map(resource => <List.Item key={resource.uuid} icon={{ source: Icon.CircleFilled, tintColor: getResourceColor(resource) }} title={resource.name} subtitle={resource.type} accessories={[
            { icon: Icon.HardDrive },
            { text: resource.type==="application" ? resource.destination.server.name : resource.server.name }
        ]} />)}
    </List>
}