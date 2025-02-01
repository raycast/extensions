import { V1PodTemplate } from "@kubernetes/client-node";
import { ResourceList } from "./components/ResourceList";
import { KubernetesContextProvider } from "./states/context";
import { KubernetesNamespaceProvider } from "./states/namespace";
import { kubernetesObjectAge } from "./utils/duration";

export default function Command() {
  return (
    <KubernetesContextProvider>
      <KubernetesNamespaceProvider>
        <ResourceList
          apiVersion="v1"
          kind="PodTemplate"
          namespaced={true}
          matchResource={matchPodTemplate}
          renderFields={renderPodTemplateFields}
        />
      </KubernetesNamespaceProvider>
    </KubernetesContextProvider>
  );
}

function matchPodTemplate(podTemplate: V1PodTemplate, searchText: string) {
  if (podTemplate.metadata?.name?.includes(searchText)) {
    return true;
  }
  return false;
}

function renderPodTemplateFields(podTemplate: V1PodTemplate) {
  return [
    `Containers: ${podTemplateContainers(podTemplate)}`,
    `Images: ${podTemplateImages(podTemplate)}`,
    `Age: ${kubernetesObjectAge(podTemplate)}`,
  ];
}

function podTemplateContainers(podTemplate: V1PodTemplate) {
  return podTemplate.template?.spec?.containers.map((container) => container.name).join(", ");
}

function podTemplateImages(podTemplate: V1PodTemplate) {
  return podTemplate.template?.spec?.containers.map((container) => container.image).join(", ");
}
