import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { generateBrandIdentity } from "../lib/notra";
import { getErrorMessage } from "../utils";
import { GenerationStatus } from "./generation-status";

export function CreateBrandIdentityForm({ onCreated }: { onCreated?: () => Promise<void> | void }) {
  const { push } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: { websiteUrl: string; name: string }) {
    const websiteUrl = values.websiteUrl.trim();
    if (!websiteUrl) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Website URL is required",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating brand identity...",
    });
    setIsSubmitting(true);

    try {
      const result = await generateBrandIdentity({
        websiteUrl,
        ...(values.name.trim() ? { name: values.name.trim() } : {}),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Generation queued";
      push(
        <GenerationStatus
          jobId={result.job.id}
          onComplete={() => {
            onCreated?.();
          }}
          type="brand-identity"
        />,
      );
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create brand identity";
      toast.message = getErrorMessage(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Stars} onSubmit={handleSubmit} title="Create Brand Identity" />
        </ActionPanel>
      }
      isLoading={isSubmitting}
      navigationTitle="Create Brand Identity"
    >
      <Form.Description text="We'll analyze your website to generate a brand identity with tone, audience, and style." />
      <Form.TextField id="websiteUrl" placeholder="https://example.com" title="Website URL" />
      <Form.TextField defaultValue="" id="name" placeholder="Brand identity name (optional)" title="Name" />
    </Form>
  );
}
