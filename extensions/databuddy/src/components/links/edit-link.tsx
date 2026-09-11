import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { DASHBOARD_URL, fetchLink, SHORT_LINK_HOST, updateLink } from "../../api";
import type { Link } from "../../types";
import { validateOptionalUrl } from "../../lib/utils";

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

function orUndefined(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}

export function EditLink({ link, onUpdate }: { link: Link; onUpdate: () => void }) {
  const { pop } = useNavigation();
  const { data: full, isLoading } = useCachedPromise(fetchLink, [link.id]);

  const src = full ?? link;

  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      name: src.name,
      targetUrl: src.targetUrl,
      slug: src.slug,
      expiresAt: src.expiresAt ? new Date(src.expiresAt) : null,
      expiredRedirectUrl: src.expiredRedirectUrl ?? "",
      ogTitle: src.ogTitle ?? "",
      ogDescription: src.ogDescription ?? "",
      ogImageUrl: src.ogImageUrl ?? "",
      ogVideoUrl: src.ogVideoUrl ?? "",
      iosUrl: src.iosUrl ?? "",
      androidUrl: src.androidUrl ?? "",
      externalId: src.externalId ?? "",
    },
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Updating link…" });
      try {
        await updateLink(link.id, {
          name: values.name.trim(),
          targetUrl: values.targetUrl.trim(),
          slug: values.slug.trim() !== link.slug ? values.slug.trim() : undefined,
          expiresAt: values.expiresAt ? values.expiresAt.toISOString() : null,
          expiredRedirectUrl: orUndefined(values.expiredRedirectUrl) ?? null,
          ogTitle: orUndefined(values.ogTitle) ?? null,
          ogDescription: orUndefined(values.ogDescription) ?? null,
          ogImageUrl: orUndefined(values.ogImageUrl) ?? null,
          ogVideoUrl: orUndefined(values.ogVideoUrl) ?? null,
          iosUrl: orUndefined(values.iosUrl) ?? null,
          androidUrl: orUndefined(values.androidUrl) ?? null,
          externalId: orUndefined(values.externalId) ?? null,
        });
        toast.style = Toast.Style.Success;
        toast.title = "Link updated";
        onUpdate();
        pop();
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to update link";
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
        if (!value?.trim()) return "Slug is required";
        if (!/^[a-zA-Z0-9_-]+$/.test(value.trim())) return "Only letters, numbers, hyphens, underscores";
        if (value.trim().length < 3) return "Slug must be at least 3 characters";
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
      isLoading={isLoading}
      navigationTitle={`Edit ${link.name}`}
      searchBarAccessory={<Form.LinkAccessory target={DASHBOARD_URL} text="Open Dashboard" />}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Editing ${SHORT_LINK_HOST}/${link.slug}`} />
      <Form.TextField
        title="Name"
        placeholder="My Link"
        info="A display name for this link in your dashboard"
        autoFocus
        {...itemProps.name}
      />
      <Form.TextField
        title="Target URL"
        placeholder="https://example.com/page"
        info="Where the short link redirects to"
        {...itemProps.targetUrl}
      />
      <Form.TextField
        title="Slug"
        placeholder="my-link"
        info={`The short path after ${SHORT_LINK_HOST}/`}
        {...itemProps.slug}
      />

      <Form.Separator />

      <Form.DatePicker
        title="Expires At"
        info="The link will stop working after this date — clear to remove expiration"
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
        info="Custom identifier for your own tracking systems"
        {...itemProps.externalId}
      />
    </Form>
  );
}
