import { Action, ActionPanel, Alert, confirmAlert, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm, usePromise } from "@raycast/utils";
import {
  activateLicense,
  BUY_URL,
  deactivateLicense,
  getSavedKey,
  keyHint,
  LICENSE_VERSION,
  saveKey,
} from "../lib/license";
import { Site } from "../lib/sites";
import { isMissingRoute } from "../lib/wordpress";

export function licenseFailure(site: Site, error: unknown): string {
  if (isMissingRoute(error)) {
    return `Update the Bricks Raycast Helper plugin on ${site.name} to ${LICENSE_VERSION} or later first (Bricks Site Health, ⌘⇧H).`;
  }
  return error instanceof Error ? error.message : String(error);
}

/** Activates `key` on a site with a toast; saves the key for other sites when it works. */
export async function activateOn(site: Site, key: string): Promise<boolean> {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Activating on ${site.name}…` });
  try {
    const license = await activateLicense(site, key.trim());
    if (!license.active) throw new Error(license.error || `The license is ${license.status}.`);
    await saveKey(key);
    toast.style = Toast.Style.Success;
    toast.title = `Bricks Raycast Pro is active on ${site.name}`;
    toast.message =
      license.activations != null && license.activation_limit != null
        ? `Used on ${license.activations} of ${license.activation_limit} sites`
        : undefined;
    return true;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't activate the license";
    toast.message = licenseFailure(site, error);
    return false;
  }
}

/**
 * Enter a license key. With a site, it's activated there; without one, it's only saved, ready to
 * activate on your sites from Bricks Raycast Pro.
 */
export function LicenseForm(props: { site?: Site; onSaved?: () => void }) {
  const { pop } = useNavigation();
  const { data: savedKey } = usePromise(getSavedKey);
  const { handleSubmit, itemProps } = useForm<{ key: string }>({
    validation: { key: FormValidation.Required },
    async onSubmit(values) {
      if (props.site) {
        if (!(await activateOn(props.site, values.key))) return;
      } else {
        await saveKey(values.key);
        await showToast({ style: Toast.Style.Success, title: "License key saved" });
      }
      props.onSaved?.();
      pop();
    },
  });

  return (
    <Form
      navigationTitle={props.site ? `License for ${props.site.name}` : "Bricks Raycast Pro License"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={props.site ? "Activate License" : "Save License Key"}
            icon={Icon.Key}
            onSubmit={handleSubmit}
          />
          <Action.OpenInBrowser title="Buy Bricks Raycast Pro" url={BUY_URL} />
        </ActionPanel>
      }
    >
      <Form.Description text="Site Audit, element and dynamic data search, Form Submissions, the Template Library and site tools need a Bricks Raycast Pro license on the site. Each site you activate uses one of your license's activations." />
      <Form.PasswordField
        {...itemProps.key}
        title="License Key"
        placeholder="From your purchase email"
        info={savedKey ? `Your saved key ends in ${keyHint(savedKey)}.` : undefined}
      />
    </Form>
  );
}

/** Add, change and remove a site's license, and buy one. Uses the saved key in one step when there is one. */
export function LicenseActions(props: { site: Site; onChange?: () => void; hasLicense?: boolean }) {
  const { data: savedKey } = usePromise(getSavedKey);

  async function remove() {
    const confirmed = await confirmAlert({
      title: `Deactivate the license on ${props.site.name}?`,
      message: "Pro features stop on this site, and the activation is free to use on another one.",
      primaryAction: { title: "Deactivate", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Deactivating…" });
    try {
      const result = await deactivateLicense(props.site);
      if (result.warning) {
        // The key is gone from the site, but the license server hasn't freed the activation yet.
        toast.style = Toast.Style.Failure;
        toast.title = `License removed from ${props.site.name}, activation not freed yet`;
        toast.message = result.warning;
      } else {
        toast.style = Toast.Style.Success;
        toast.title = `License deactivated on ${props.site.name}`;
      }
      props.onChange?.();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't deactivate the license";
      toast.message = licenseFailure(props.site, error);
    }
  }

  return (
    <ActionPanel.Section title="Bricks Raycast Pro">
      {savedKey && !props.hasLicense && (
        <Action
          title={`Activate License (${keyHint(savedKey)})`}
          icon={Icon.Key}
          onAction={async () => {
            if (await activateOn(props.site, savedKey)) props.onChange?.();
          }}
        />
      )}
      <Action.Push
        title={props.hasLicense || savedKey ? "Enter a Different License Key" : "Add License Key"}
        icon={Icon.Key}
        shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
        target={<LicenseForm site={props.site} onSaved={props.onChange} />}
      />
      {!props.hasLicense && <Action.OpenInBrowser title="Buy Bricks Raycast Pro" icon={Icon.Cart} url={BUY_URL} />}
      {props.hasLicense !== false && (
        <Action title="Deactivate License" icon={Icon.XMarkCircle} style={Action.Style.Destructive} onAction={remove} />
      )}
    </ActionPanel.Section>
  );
}
