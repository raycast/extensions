import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast, type LaunchProps } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { createLink, DASHBOARD_URL, SHORT_LINK_HOST } from "./api";
import { validateOptionalUrl } from "./lib/utils";

interface FormValues {
  name: string;
  targetUrl: string;
  slug: string;
  expiresAt: Date | null;
  expiredRedirectUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  ogVideoUrl: string;
  iosUrl: string;
  androidUrl: string;
  externalId: string;
}

export default function Command(props: LaunchProps<{ draftValues: FormValues }>) {
  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: props.draftValues,
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating link…" });
      try {
        const link = await createLink({
          name: values.name.trim(),
          targetUrl: values.targetUrl.trim(),
          ...(values.slug?.trim() ? { slug: values.slug.trim() } : {}),
          ...(values.expiresAt ? { expiresAt: values.expiresAt.toISOString() } : {}),
          ...(values.expiredRedirectUrl?.trim() ? { expiredRedirectUrl: values.expiredRedirectUrl.trim() } : {}),
          ...(values.ogTitle?.trim() ? { ogTitle: values.ogTitle.trim() } : {}),
          ...(values.ogDescription?.trim() ? { ogDescription: values.ogDescription.trim() } : {}),
          ...(values.ogImageUrl?.trim() ? { ogImageUrl: values.ogImageUrl.trim() } : {}),
          ...(values.ogVideoUrl?.trim() ? { ogVideoUrl: values.ogVideoUrl.trim() } : {}),
          ...(values.iosUrl?.trim() ? { iosUrl: values.iosUrl.trim() } : {}),
          ...(values.androidUrl?.trim() ? { androidUrl: values.androidUrl.trim() } : {}),
          ...(values.externalId?.trim() ? { externalId: values.externalId.trim() } : {}),
        });
        toast.style = Toast.Style.Success;
        toast.title = "Link created";
        toast.message = `${SHORT_LINK_HOST}/${link.slug}`;
        popToRoot();
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create link";
        toast.message = err instanceof Error ? err.message : String(err);
      }
    },
    validation: {
      name: FormValidation.Required,
      targetUrl(value) {
        if (!value?.trim()) return "Target URL is required";
        try {
          new URL(value.trim());
        } catch {
          return "Enter a valid URL (e.g. https://example.com)";
        }
      },
      slug(value) {
        if (value?.trim() && !/^[a-zA-Z0-9_-]+$/.test(value.trim())) {
          return "Only letters, numbers, hyphens, underscores";
        }
        if (value?.trim() && value.trim().length < 3) {
          return "Slug must be at least 3 characters";
        }
      },
      expiredRedirectUrl: (v) => validateOptionalUrl(v, "expired redirect"),
      ogImageUrl: (v) => validateOptionalUrl(v, "OG image"),
      ogVideoUrl: (v) => validateOptionalUrl(v, "OG video"),
      iosUrl: (v) => validateOptionalUrl(v, "iOS"),
      androidUrl: (v) => validateOptionalUrl(v, "Android"),
    },
  });

  return (
    <Form
      enableDrafts
      searchBarAccessory={<Form.LinkAccessory target={DASHBOARD_URL} text="Open Dashboard" />}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Link" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a short link to track clicks with Databuddy analytics." />
      <Form.TextField
        title="Name"
        placeholder="Product Launch"
        info="A display name for this link in your dashboard"
        autoFocus
        {...itemProps.name}
      />
      <Form.TextField
        title="Target URL"
        placeholder="https://example.com/landing-page"
        info="The destination URL when someone clicks the link"
        {...itemProps.targetUrl}
      />
      <Form.TextField
        title="Custom Slug"
        placeholder="launch-2026"
        info={`Optional — leave empty for an auto-generated slug (${SHORT_LINK_HOST}/your-slug)`}
        {...itemProps.slug}
      />

      <Form.Separator />

      <Form.DatePicker
        title="Expires At"
        info="Optional — the link will stop working after this date"
        type={Form.DatePicker.Type.DateTime}
        {...itemProps.expiresAt}
      />
      <Form.TextField
        title="Expired Redirect"
        placeholder="https://example.com/expired"
        info="Where to redirect visitors after the link expires"
        {...itemProps.expiredRedirectUrl}
      />

      <Form.Separator />

      <Form.TextField
        title="OG Title"
        placeholder="Check this out!"
        info="Custom Open Graph title shown in social media previews"
        {...itemProps.ogTitle}
      />
      <Form.TextField
        title="OG Description"
        placeholder="A short description for social sharing"
        info="Custom Open Graph description for social media previews"
        {...itemProps.ogDescription}
      />
      <Form.TextField
        title="OG Image URL"
        placeholder="https://example.com/og-image.png"
        info="Image URL shown in social media link previews"
        {...itemProps.ogImageUrl}
      />
      <Form.TextField
        title="OG Video URL"
        placeholder="https://example.com/og-video.mp4"
        info="Video URL for rich social media link previews"
        {...itemProps.ogVideoUrl}
      />

      <Form.Separator />

      <Form.TextField
        title="iOS URL"
        placeholder="https://apps.apple.com/app/..."
        info="Deep link or App Store URL for iOS users"
        {...itemProps.iosUrl}
      />
      <Form.TextField
        title="Android URL"
        placeholder="https://play.google.com/store/apps/..."
        info="Deep link or Play Store URL for Android users"
        {...itemProps.androidUrl}
      />

      <Form.Separator />

      <Form.TextField
        title="External ID"
        placeholder="campaign-123"
        info="Optional custom identifier for your own tracking systems"
        {...itemProps.externalId}
      />
    </Form>
  );
}
