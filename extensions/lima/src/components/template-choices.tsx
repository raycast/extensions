import { Form } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { listTemplates } from "../lib/lima";

/** Picked first, in this order, when the Lima install has them. The rest follow by name. */
const POPULAR = ["default", "docker", "podman", "k8s", "ubuntu", "debian", "fedora", "alpine", "archlinux"];

/** Lima's templates, and the one picked last, which forms start from. */
export function useTemplates() {
  const [lastTemplate, setLastTemplate] = useCachedState("create:template", "default");
  const { data: templates, isLoading } = useCachedPromise(listTemplates, [], {
    failureToastOptions: { title: "Couldn't load templates" },
  });
  return { templates, isLoading, lastTemplate, setLastTemplate };
}

/** The Template dropdown's items: popular ones, the rest, then experimental ones. */
export function templateChoices(templates: string[] | undefined, lastTemplate: string) {
  // Shown before the templates load, so the remembered one stays picked.
  if (!templates) return <Form.Dropdown.Item title={lastTemplate} value={lastTemplate} />;
  const available = templates.filter((template) => !template.startsWith("_"));
  const sections = [
    { title: "Popular", items: POPULAR.filter((template) => available.includes(template)) },
    { title: "More", items: available.filter((template) => !POPULAR.includes(template) && !template.includes("/")) },
    { title: "Experimental", items: available.filter((template) => template.includes("/")) },
  ];
  return sections.map((section) => (
    <Form.Dropdown.Section key={section.title} title={section.title}>
      {section.items.map((template) => (
        <Form.Dropdown.Item key={template} title={template} value={template} />
      ))}
    </Form.Dropdown.Section>
  ));
}
