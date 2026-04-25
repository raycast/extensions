import {
  Clipboard,
  LaunchProps,
  Toast,
  popToRoot,
  showHUD,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { LinkForm, type LinkFormValues } from "@/components/link-form";
import { LinkQrView } from "@/components/link-qr";
import { shortenUrl } from "@/api/urls";
import { useAuth } from "@/hooks/use-auth";
import { readActiveUrl } from "@/lib/clipboard";
import { reportError } from "@/lib/errors";
import { getPreferences } from "@/constants";
import type { UrlListItem, UrlResponse } from "@/schemas/url";

interface ShortenLaunchContext {
  prefillUrl?: string;
  autoSubmit?: boolean;
}

export default function Shorten(
  props: LaunchProps<{ launchContext?: ShortenLaunchContext }>,
) {
  return (
    <AuthGate>
      <ShortenForm launchContext={props.launchContext} />
    </AuthGate>
  );
}

function ShortenForm({
  launchContext,
}: {
  launchContext?: ShortenLaunchContext;
}) {
  const { push } = useNavigation();
  const { isAuthenticated } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const autoSubmittedRef = useRef(false);
  const [prefillUrl, setPrefillUrl] = useState(launchContext?.prefillUrl ?? "");

  useEffect(() => {
    if (launchContext?.prefillUrl) return;
    readActiveUrl().then((url) => {
      if (url) setPrefillUrl(url);
    });
  }, [launchContext?.prefillUrl]);

  const handleSubmit = async (values: LinkFormValues) => {
    setSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Shortening…",
    });
    try {
      const maxClicksNumber = values.maxClicks
        ? Number.parseInt(values.maxClicks, 10)
        : undefined;
      const expireAfter =
        values.expireSeconds && values.expireSeconds > 0
          ? values.expireSeconds
          : undefined;

      const result = await shortenUrl({
        long_url: values.longUrl,
        alias: values.alias || undefined,
        password: values.password || undefined,
        max_clicks: Number.isFinite(maxClicksNumber as number)
          ? maxClicksNumber
          : undefined,
        expire_after: expireAfter,
        block_bots: values.blockBots,
        private_stats: values.privateStats,
      });

      const { autoCopy, celebrate } = getPreferences();
      if (autoCopy) await Clipboard.copy(result.short_url);

      if (launchContext?.autoSubmit) {
        toast.hide();
        const emojiLike = /\p{Extended_Pictographic}/u.test(result.alias);
        const prefix = celebrate && emojiLike ? "🎉" : "🔗";
        await showHUD(
          `${prefix} ${autoCopy ? "Copied" : "Shortened"} ${result.short_url}`,
        );
        await popToRoot();
        return;
      }

      toast.style = Toast.Style.Success;
      toast.title = "Shortened";
      toast.message = result.short_url;
      const expiresAtUnix =
        expireAfter && expireAfter > 0
          ? Math.floor(Date.now() / 1000) + expireAfter
          : undefined;
      push(
        <LinkQrView
          link={toListItem(result, {
            passwordSet: !!values.password,
            blockBots: values.blockBots,
            privateStats: values.privateStats,
            maxClicks: maxClicksNumber,
            expiresAt: expiresAtUnix,
          })}
        />,
      );
    } catch (err) {
      toast.hide();
      await reportError(err);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!launchContext?.autoSubmit) return;
    if (!isAuthenticated) return;
    if (!prefillUrl) return;
    if (autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    handleSubmit({
      longUrl: prefillUrl,
      alias: "",
      password: "",
      maxClicks: "",
      expireSeconds: null,
      blockBots: true,
      privateStats: false,
      removePassword: false,
      removeMaxClicks: false,
    });
  }, [isAuthenticated, prefillUrl, launchContext?.autoSubmit]);

  return (
    <LinkForm
      mode="create"
      initialValues={{ longUrl: prefillUrl }}
      isLoading={submitting}
      onSubmit={handleSubmit}
      skipClipboardPrefill
    />
  );
}

interface ToListItemOverrides {
  passwordSet?: boolean;
  blockBots?: boolean;
  privateStats?: boolean;
  maxClicks?: number;
  expiresAt?: number;
}

function toListItem(
  url: UrlResponse,
  overrides: ToListItemOverrides = {},
): UrlListItem {
  const createdAt =
    typeof url.created_at === "number"
      ? new Date(url.created_at * 1000).toISOString()
      : url.created_at;
  return {
    id: url.alias,
    alias: url.alias,
    short_url: url.short_url,
    long_url: url.long_url,
    created_at: createdAt,
    status: url.status ?? "ACTIVE",
    total_clicks: 0,
    last_click: null,
    max_clicks: overrides.maxClicks ?? null,
    expire_after: overrides.expiresAt ?? null,
    password_set: overrides.passwordSet ?? false,
    block_bots: overrides.blockBots ?? false,
    private_stats: overrides.privateStats ?? url.private_stats ?? false,
  };
}
