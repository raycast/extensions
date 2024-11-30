import { Action, ActionPanel, Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ErrorResult, ListProjectsResult, ListServicesResult, State } from "./interfaces";

function useAiven<T>(endpoint: string) {
    const { token } = getPreferenceValues<Preferences>();
    const { isLoading, data } = useFetch(`https://api.aiven.io/v1/${endpoint}`, {
        headers: {
            Authorization: `aivenv1 ${token}`,
            "Content-Type": "application/json"
        },
        mapResult(result: ErrorResult | (object & T)) {
            if ("message" in result) throw new Error(result.message);
            return {
                data: result
            }
        }
    })

    return { isLoading, data }
}

export default function Projects() {
    
    const { isLoading, data }  = useAiven<ListProjectsResult>("project");
    return <List isLoading={isLoading} isShowingDetail>
        {data?.projects.map(project => <List.Item key={project.project_name} icon={Icon.Folder} title={project.project_name} accessories={[{ icon: Icon.Tag, tag: Object.keys(project.tags).length.toString() }]}
            detail={<List.Item.Detail metadata={<List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Tags" />
                {Object.entries(project.tags).map(([key, val]) => <List.Item.Detail.Metadata.Label key={key} title={key} text={val} />)}
            </List.Item.Detail.Metadata>} />} actions={<ActionPanel>
                <Action.Push icon={Icon.Coin} title="View Services" target={<Services project={project.project_name} />} />
            </ActionPanel>} />)
        }
    </List>
}

function getServiceIconColor(state: State) {
    switch (state) {
        case State.POWEROFF: return Color.Red;
        case State.REBALANCING:
        case State.REBUILDING: return Color.Yellow;
        case State.RUNNING: return Color.Green;
    }
}
function Services({ project }: { project: string }) {
    const { isLoading, data } = useAiven<ListServicesResult>(`project/${project}/service`);

    return <List isLoading={isLoading}>
        {data?.services.map(service => <List.Item key={service.service_name} icon={{ source: Icon.CircleFilled, tintColor: getServiceIconColor(service.state) }} title={service.service_name} subtitle={service.service_type} accessories={[ { tag: `Nodes (${service.node_count})` }, {date: new Date(service.create_time), tooltip: `Created: ${new Date(service.create_time).toDateString()}`}]} />)}
    </List>
}