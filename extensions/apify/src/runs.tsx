import { Action, ActionPanel, Color, Detail, getPreferenceValues, Icon, Image, List } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { ActorRunListItem, ApifyClient } from "apify-client";

const STATUS_ICON: Record<ActorRunListItem["status"], Image.ImageLike> = {
    SUCCEEDED: { source: Icon.Check, tintColor: Color.Green }
}

function formatDate(date: Date) {
    const formatter = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
    return formatter.format(date);
}

const {token} = getPreferenceValues<Preferences>();
const apify = new ApifyClient({token});

export default function Runs() {
    const {isLoading,data: runs} = useCachedPromise(
        async () => {
            const {items} = await apify.runs().list();
            return items;
        }, [], {
            initialData: []
        }
    )

    return <List isLoading={isLoading}>
        {runs.map(run => <List.Item key={run.id} icon={{value: STATUS_ICON[run.status], tooltip: run.status}} title={run.id} accessories={[
            {text: `Started ${formatDate(run.startedAt)}`},
            {text: `Finished ${formatDate(run.finishedAt)}`},
            {text: run.buildNumber, tooltip: "Build"},
            {tag: run.meta.origin, tooltip: "Origin"}
        ]} actions={<ActionPanel>
            <Action.Push icon={Icon.Play} title="Get Run" target={<GetRun id={run.id} />} />
        </ActionPanel>} />)}
    </List>
}

function GetRun({id}: {id:string}) {
    const {isLoading,data: run} = usePromise(async() => {
        const run = await apify.run(id).get();
        return run;
    })

    return <Detail isLoading={isLoading} markdown={run?.statusMessage} metadata={run && <Detail.Metadata>
        <Detail.Metadata.Label title="Run ID" text={run.id} />
        <Detail.Metadata.Link title="Container URL" text={run.containerUrl} target={run.containerUrl} />
    </Detail.Metadata>} />
}