import { ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { neon } from "./neon";
import { OpenInNeon } from "./components";

export default function ListAPIKeys() {
    const { isLoading, data } = useCachedPromise(async () => {
        const res = await neon.listProjects({});
        return res.data.projects;
    }, [], {
        initialData: []
    });

    const formatBytes = (bytes: number) => {
        const sizeInMB = (bytes / (1000 * 1000)).toFixed(2);
        return `${sizeInMB} MB`;
    };      

    return <List isLoading={isLoading}>
        {data.map(project => <List.Item key={project.id} icon={Icon.Dot} title={project.name} subtitle={project.region_id} accessories={[{ icon: Icon.Store, text: project.synthetic_storage_size ? formatBytes(project.synthetic_storage_size) : "" }, { icon: `number-${project.pg_version}-16` }]} actions={<ActionPanel>
            <OpenInNeon route={`projects/${project.id}`} />
        </ActionPanel>} />)}
    </List>
}