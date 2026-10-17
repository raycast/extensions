import { Action, ActionPanel, Form, Icon, open, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { NoSitesView } from "./site-empty-view";
import { useSelectedSite } from "../hooks/use-selected-site";
import { createContent } from "../lib/wordpress";

// Bricks template types (Bricks › Templates › Add New).
const TEMPLATE_TYPES = [
  { value: "header", title: "Header" },
  { value: "footer", title: "Footer" },
  { value: "section", title: "Section" },
  { value: "content", title: "Single" },
  { value: "archive", title: "Archive" },
  { value: "search", title: "Search Results" },
  { value: "error", title: "Error Page" },
  { value: "popup", title: "Popup" },
  { value: "password_protection", title: "Password Protection" },
];

interface Values {
  siteId: string;
  type: string;
  title: string;
  templateType: string;
}

/** New draft page, post or Bricks template, opened straight in the builder. Pushed from Open in Bricks (⌘N). */
export function CreateForm() {
  const { sites, site, setSiteId, isLoading, reloadSites } = useSelectedSite();

  const { handleSubmit, itemProps, values } = useForm<Values>({
    initialValues: { type: "page", templateType: "header" },
    validation: { title: FormValidation.Required },
    async onSubmit(form) {
      const target = sites.find((s) => s.id === form.siteId) ?? site;
      if (!target) return;
      setSiteId(target.id);
      const toast = await showToast({ style: Toast.Style.Animated, title: `Creating ${form.title}…` });
      try {
        const created = await createContent(target, {
          type: form.type,
          title: form.title.trim(),
          templateType: form.type === "bricks_template" ? form.templateType : undefined,
        });
        await toast.hide();
        await open(created.builderUrl);
        await showHUD(`Created ${created.title} as a draft, opening Bricks`);
        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Couldn't create it";
        toast.message = error instanceof Error ? error.message : String(error);
      }
    },
  });

  if (!isLoading && sites.length === 0) {
    return (
      <NoSitesView
        onSaved={(saved) => {
          setSiteId(saved.id);
          reloadSites();
        }}
      />
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create and Open in Bricks" icon={Icon.Hammer} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {sites.length > 1 && (
        <Form.Dropdown id="siteId" title="Site" defaultValue={site?.id}>
          {sites.map((s) => (
            <Form.Dropdown.Item key={s.id} value={s.id} title={s.name} icon={Icon.Globe} />
          ))}
        </Form.Dropdown>
      )}
      <Form.Dropdown title="Type" {...itemProps.type}>
        <Form.Dropdown.Item value="page" title="Page" icon={Icon.Document} />
        <Form.Dropdown.Item value="post" title="Post" icon={Icon.Paragraph} />
        <Form.Dropdown.Item value="bricks_template" title="Bricks Template" icon={Icon.AppWindowGrid3x3} />
      </Form.Dropdown>
      {values.type === "bricks_template" && (
        <Form.Dropdown title="Template Type" {...itemProps.templateType}>
          {TEMPLATE_TYPES.map((t) => (
            <Form.Dropdown.Item key={t.value} value={t.value} title={t.title} />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextField title="Title" placeholder="About us" {...itemProps.title} />
      <Form.Description text="It's created as a draft and opens straight in the builder." />
    </Form>
  );
}
