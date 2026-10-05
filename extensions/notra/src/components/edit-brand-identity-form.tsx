import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { updateBrandIdentity } from "../lib/notra";
import { TONE_PROFILE_OPTIONS } from "../schemas";
import type { BrandIdentity } from "../types";
import { getErrorMessage } from "../utils";

interface EditBrandIdentityFormValues {
  audience: string;
  companyDescription: string;
  companyName: string;
  customInstructions: string;
  customTone: string;
  language: string;
  name: string;
  toneProfile: string;
  websiteUrl: string;
}

interface EditBrandIdentityFormProps {
  brandIdentity: BrandIdentity;
  onUpdated?: () => Promise<void> | void;
}

export function EditBrandIdentityForm({ brandIdentity, onUpdated }: EditBrandIdentityFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: EditBrandIdentityFormValues) {
    const name = values.name.trim();
    if (!name) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name is required",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving brand identity",
    });
    setIsLoading(true);

    try {
      await updateBrandIdentity(brandIdentity.id, {
        name,
        websiteUrl: values.websiteUrl.trim() || brandIdentity.websiteUrl,
        companyName: values.companyName.trim() || null,
        companyDescription: values.companyDescription.trim() || null,
        toneProfile: values.toneProfile || null,
        customTone: values.customTone.trim() || null,
        customInstructions: values.customInstructions.trim() || null,
        audience: values.audience.trim() || null,
        language: values.language.trim() || null,
      });
      await onUpdated?.();
      toast.style = Toast.Style.Success;
      toast.title = "Brand identity updated";
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not update brand identity";
      toast.message = getErrorMessage(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Save Changes" />
        </ActionPanel>
      }
      isLoading={isLoading}
      navigationTitle="Edit Brand Identity"
    >
      <Form.TextField defaultValue={brandIdentity.name} id="name" placeholder="Brand identity name" title="Name" />
      <Form.TextField
        defaultValue={brandIdentity.websiteUrl}
        id="websiteUrl"
        placeholder="https://example.com"
        title="Website URL"
      />
      <Form.TextField
        defaultValue={brandIdentity.companyName ?? ""}
        id="companyName"
        placeholder="Company name (optional)"
        title="Company Name"
      />
      <Form.TextArea
        defaultValue={brandIdentity.companyDescription ?? ""}
        id="companyDescription"
        placeholder="Describe what your company does (optional)"
        title="Company Description"
      />

      <Form.Separator />

      <Form.Dropdown defaultValue={brandIdentity.toneProfile ?? ""} id="toneProfile" title="Tone Profile">
        <Form.Dropdown.Item title="None" value="" />
        {TONE_PROFILE_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} title={option.title} value={option.value} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        defaultValue={brandIdentity.customTone ?? ""}
        id="customTone"
        placeholder="Custom tone description (optional)"
        title="Custom Tone"
      />
      <Form.TextArea
        defaultValue={brandIdentity.customInstructions ?? ""}
        id="customInstructions"
        placeholder="Additional writing instructions (optional)"
        title="Custom Instructions"
      />

      <Form.Separator />

      <Form.TextField
        defaultValue={brandIdentity.audience ?? ""}
        id="audience"
        placeholder="Target audience (optional)"
        title="Audience"
      />
      <Form.TextField
        defaultValue={brandIdentity.language ?? ""}
        id="language"
        placeholder="e.g. English, Spanish (optional)"
        title="Language"
      />
    </Form>
  );
}
