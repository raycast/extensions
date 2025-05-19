import { Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { getAvatarIcon, useFetch } from "@raycast/utils";

const { instance_url, api_token } = getPreferenceValues<Preferences>();

export default function Projects() {
    type Project = {
        id: string;
        name: string;
        members: number;
        servers: number;
        // is_default: boolean;
        // is_owner: boolean;
    }
    const { isLoading, data: projects } = useFetch(new URL("api/v1/projects", instance_url).toString(), {
        headers: {
            Authorization: `Bearer ${api_token}`
        },
        mapResult(result: { data: Project[] }) {
            return {
                data: result.data
            }    
        },
        initialData: []
    })

    return <List isLoading={isLoading}>
         {projects.map(project => <List.Item key={project.id} icon={getAvatarIcon(project.name)} title={project.name} accessories={[
            { icon: "resource.svg", text: `${project.servers} servers` },
            { icon: "user.svg", text: `${project.members} members` }
         ]} />)}
    </List>
}