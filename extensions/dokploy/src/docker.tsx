import { Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { DockerContainer } from "./interfaces";
import { useToken } from "./api-keys";

export default function Docker() {
  const { url, headers } = useToken();

const { isLoading, data: containers } = useFetch<DockerContainer[], DockerContainer[]>(url + "docker.getContainers", {
  headers,
  initialData: []
})

  return (
    <List isLoading={isLoading}>
      {containers.map(container => <List.Item key={container.containerId} icon={Icon.Box} title={container.name} accessories={[
        {tag: container.state},
        {text: container.status},
        {text: container.image}
      ]} 
     />)}
    </List>
  );
}