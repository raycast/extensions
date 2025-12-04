import { CoreV1Event } from "@kubernetes/client-node";
import { ResourceList } from "./components/ResourceList";
import { KubernetesContextProvider } from "./states/context";
import { KubernetesNamespaceProvider } from "./states/namespace";

export default function Command() {
  return (
    <KubernetesContextProvider>
      <KubernetesNamespaceProvider>
        <ResourceList
          apiVersion="v1"
          kind="Event"
          namespaced={true}
          matchResource={matchEvent}
          renderFields={renderEventFields}
        />
      </KubernetesNamespaceProvider>
    </KubernetesContextProvider>
  );
}

function matchEvent(event: CoreV1Event, searchText: string): boolean {
  // 1. Search by type
  if (event.type?.toLowerCase().includes(searchText)) {
    return true;
  }

  // 2. Search by reason
  if (event.reason?.toLowerCase().includes(searchText)) {
    return true;
  }

  // 3. Search by involved object
  const involvedObject = `${event.involvedObject?.kind}/${event.involvedObject?.name}`;
  if (involvedObject.includes(searchText)) {
    return true;
  }

  return false;
}

function renderEventFields(event: CoreV1Event) {
  return [
    event.type ?? "<unknown type>",
    event.reason ?? "<unknown reason>",
    `${event.involvedObject?.kind}/${event.involvedObject?.name}`,
  ];
}
