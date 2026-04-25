import { Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { LinkForm, type LinkFormValues } from "@/components/link-form";
import { updateUrl } from "@/api/urls";
import { reportError } from "@/lib/errors";
import type { UrlListItem } from "@/schemas/url";

interface EditLinkViewProps {
  link: UrlListItem;
  onMutated: () => void;
}

export function EditLinkView({ link, onMutated }: EditLinkViewProps) {
  const { pop } = useNavigation();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: LinkFormValues) => {
    setSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving…",
    });
    try {
      const maxClicks = values.maxClicks
        ? Number.parseInt(values.maxClicks, 10)
        : undefined;
      // -1 = "keep current", null = "no expiry", >0 = new duration
      const expireAfter =
        values.expireSeconds === -1
          ? undefined
          : (values.expireSeconds ?? undefined);

      const originalAlias = link.alias ?? link.id;
      const aliasChanged = values.alias && values.alias !== originalAlias;

      await updateUrl(link.id, {
        long_url: values.longUrl,
        alias: aliasChanged ? values.alias : undefined,
        password: values.removePassword ? null : values.password || undefined,
        max_clicks: values.removeMaxClicks
          ? 0
          : Number.isFinite(maxClicks as number)
            ? maxClicks
            : undefined,
        expire_after: expireAfter && expireAfter > 0 ? expireAfter : undefined,
        block_bots: values.blockBots,
        private_stats: values.privateStats,
      });

      toast.style = Toast.Style.Success;
      toast.title = "Link updated";
      onMutated();
      pop();
    } catch (err) {
      toast.hide();
      await reportError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LinkForm
      mode="edit"
      initialValues={{
        longUrl: link.long_url ?? "",
        alias: link.alias ?? link.id,
        maxClicks: link.max_clicks ? String(link.max_clicks) : "",
        expireSeconds: link.expire_after ?? null,
        blockBots: link.block_bots ?? false,
        privateStats: link.private_stats ?? false,
      }}
      isLoading={submitting}
      onSubmit={handleSubmit}
      skipClipboardPrefill
      hasPassword={link.password_set}
      hasMaxClicks={!!link.max_clicks}
    />
  );
}
