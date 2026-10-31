import { Action, ActionPanel, Form, Icon, open, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { randomUUID } from "node:crypto";
import { getAnyBrowserTabUrl } from "../lib/browser";
import { normalizeSiteUrl, Site, upsertSite, wpAdminUrl } from "../lib/sites";
import { checkConnection } from "../lib/wordpress";

interface FormValues {
  name: string;
  url: string;
  username: string;
  appPassword: string;
  allowSelfSigned: boolean;
}

export function SiteForm(props: { site?: Site; onSaved?: (site: Site) => void }) {
  const { pop } = useNavigation();
  const { site } = props;

  const {
    handleSubmit,
    itemProps,
    setValue,
    values: current,
  } = useForm<FormValues>({
    initialValues: {
      name: site?.name ?? "",
      url: site?.url ?? "",
      username: site?.username ?? "",
      appPassword: site?.appPassword ?? "",
      allowSelfSigned: site?.allowSelfSigned ?? false,
    },
    validation: {
      url: (value) => {
        if (!value?.trim()) return "Required";
        try {
          normalizeSiteUrl(value);
        } catch {
          return "Not a valid URL";
        }
      },
      appPassword: (value) => {
        if (itemProps.username.value?.trim() && !value?.trim()) return "Needed with a username";
      },
      name: FormValidation.Required,
    },
    async onSubmit(values) {
      let candidate: Site = {
        id: site?.id ?? randomUUID(),
        name: values.name.trim(),
        url: normalizeSiteUrl(values.url),
        username: values.username.trim() || undefined,
        appPassword: values.appPassword.trim() || undefined,
        allowSelfSigned: values.allowSelfSigned,
      };
      // "Save Anyway" keeps the admin URL found earlier, as long as the site URL didn't change.
      if (site?.adminUrl && site.url === candidate.url) candidate = { ...candidate, adminUrl: site.adminUrl };

      const toast = await showToast({ style: Toast.Style.Animated, title: `Connecting to ${candidate.name}…` });
      try {
        const check = await checkConnection(candidate);
        if (check.canonicalUrl) candidate = { ...candidate, url: check.canonicalUrl };
        candidate = { ...candidate, adminUrl: check.adminUrl };
        await upsertSite(candidate);
        toast.style = Toast.Style.Success;
        toast.title = `Saved ${candidate.name}`;
        toast.message = [
          check.canonicalUrl ? `Saved as ${check.canonicalUrl}, where the site lives` : undefined,
          check.user ? `Signed in as ${check.user}` : "Public content only",
          check.hasBricks ? undefined : "Bricks wasn't detected",
          check.user ? (check.hasHelper ? "Helper plugin active" : "Helper plugin not installed") : undefined,
        ]
          .filter(Boolean)
          .join(" · ");
        props.onSaved?.(candidate);
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Couldn't connect";
        toast.message = error instanceof Error ? error.message : String(error);
        toast.primaryAction = {
          title: "Save Anyway",
          onAction: async (t) => {
            await upsertSite(candidate);
            await t.hide();
            props.onSaved?.(candidate);
            pop();
          },
        };
      }
    },
  });

  async function fillFromBrowser() {
    try {
      const tab = await getAnyBrowserTabUrl();
      if (!tab) {
        await showToast({ style: Toast.Style.Failure, title: "No browser tab with a website open" });
        return;
      }
      const url = new URL(tab);
      // A wp-admin or wp-login URL shows where WordPress lives, subfolder installs included.
      const wpPath = url.pathname.match(/^(.*?)\/(wp-admin|wp-login\.php)/);
      const siteUrl = `${url.origin}${wpPath ? wpPath[1] : ""}`;
      setValue("url", siteUrl);
      if (!current.name.trim()) setValue("name", url.hostname.replace(/^www\./, ""));
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't read the browser tab",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function openApplicationPasswords() {
    try {
      const url = normalizeSiteUrl(current.url);
      // An existing site may keep WordPress in a subfolder of its home URL.
      const base = site && site.url === url ? site : { id: "", name: "", url };
      await open(wpAdminUrl(base, "profile.php#application-passwords-section"));
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Enter the site URL first" });
    }
  }

  return (
    <Form
      navigationTitle={site ? `Edit ${site.name}` : "Add Bricks Site"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Site" icon={Icon.Check} onSubmit={handleSubmit} />
          <Action
            title="Fill from Browser Tab"
            icon={Icon.Globe}
            shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
            onAction={fillFromBrowser}
          />
          <Action
            title="Open Application Passwords Page"
            icon={Icon.Key}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            onAction={openApplicationPasswords}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Client Site" {...itemProps.name} />
      <Form.TextField title="Site URL" placeholder="https://example.com" {...itemProps.url} />
      <Form.Separator />
      <Form.Description text="Optional, but needed for drafts, private pages and Bricks templates. Create an application password in WordPress under Users › Profile › Application Passwords (⌘⇧P opens it). ⌘⇧B fills the URL from your browser tab." />
      <Form.TextField title="Username" placeholder="admin" {...itemProps.username} />
      <Form.PasswordField
        title="Application Password"
        placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
        {...itemProps.appPassword}
      />
      <Form.Checkbox
        label="Allow self-signed certificate"
        info="For local sites (Local, DDEV, Herd) whose HTTPS certificate Node doesn't trust."
        {...itemProps.allowSelfSigned}
      />
    </Form>
  );
}
