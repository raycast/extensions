import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  Toast,
  confirmAlert,
  openExtensionPreferences,
  popToRoot,
  showToast,
} from "@raycast/api";
import { FormValidation, showFailureToast, useCachedPromise, useForm } from "@raycast/utils";
import { accountId, BrixError, getJson, getPage, sameAccount, sendJson } from "./api";
import { OrgNode, Screen } from "./types";

/**
 * Post a message to screens. The same two calls the Brix console makes:
 *   1. POST /v1/creatives: a one-slide design with the headline and body.
 *   2. POST /v1/casts: show it on the screens until the end time.
 * If step 2 fails, the design from step 1 goes to the recycle bin.
 */

const HEADLINE_MAX = 120;
const BODY_MAX = 400;

const TONE_BG: Record<string, string> = {
  announcement: "#2563eb",
  alert: "#dc2626",
  celebrate: "#16a34a",
  info: "#334155",
};

interface Values {
  headline: string;
  body: string;
  tone: string;
  scope: string;
  screenIds: string[];
  locationId: string;
  minutes: string;
}

function boxes(headline: string, body: string, tone: string) {
  return [
    { kind: "shape", shape: "rect", x: 0, y: 0, w: 1, h: 1, fill: TONE_BG[tone] ?? TONE_BG.announcement },
    {
      kind: "text",
      text: headline,
      x: 0.08,
      y: body ? 0.24 : 0.38,
      w: 0.84,
      h: 0.32,
      color: "#ffffff",
      fontWeight: 700,
      align: "center",
    },
    ...(body
      ? [
          {
            kind: "text",
            text: body,
            x: 0.12,
            y: 0.62,
            w: 0.76,
            h: 0.22,
            color: "#f8fafc",
            fontWeight: 400,
            align: "center",
          },
        ]
      : []),
  ];
}

function locationLabels(nodes: OrgNode[]): { id: string; label: string }[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return nodes
    .map((n) => {
      const parts: string[] = [];
      let cur: OrgNode | undefined = n;
      for (let i = 0; cur && i < 20; i++) {
        parts.unshift(cur.name || cur.id);
        cur = cur.parentId ? byId.get(cur.parentId) : undefined;
      }
      return { id: n.id, label: parts.join(" › ") };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

export default function PostMessage() {
  // The account id keeps each key's lists apart in the cache.
  const screens = useCachedPromise(
    (account: string) => {
      sameAccount(account);
      return getPage<Screen>("/v1/screens", { limit: 500 });
    },
    [accountId()],
    { failureToastOptions: { title: "Could not load screens" } },
  );
  // A key without access to the location list gets no location choice.
  const locations = useCachedPromise(
    (account: string) => {
      sameAccount(account);
      return getJson<OrgNode[]>("/v1/org-nodes");
    },
    [accountId()],
    {
      onError: () => undefined,
    },
  );

  const { handleSubmit, itemProps, values, setValidationError } = useForm<Values>({
    initialValues: { tone: "announcement", scope: "all", minutes: "60", screenIds: [] },
    validation: {
      headline: (v) => {
        if (!v?.trim()) return "Enter a headline";
        if (v.trim().length > HEADLINE_MAX) return `Use ${HEADLINE_MAX} characters or fewer`;
      },
      body: (v) => (v && v.trim().length > BODY_MAX ? `Use ${BODY_MAX} characters or fewer` : undefined),
      minutes: (v) => {
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1 || n > 1440) return "Enter 1 to 1440 minutes";
      },
      scope: FormValidation.Required,
    },
    async onSubmit(v) {
      // Checked here, not in `validation`: these fields count only for one scope.
      if (v.scope === "screens" && (!v.screenIds || v.screenIds.length === 0)) {
        setValidationError("screenIds", "Select a screen");
        return false;
      }
      if (v.scope === "node" && !v.locationId) {
        setValidationError("locationId", "Select a location");
        return false;
      }
      if (v.scope === "all") {
        const count = screens.data?.data.length;
        const ok = await confirmAlert({
          title: "Show the message on all screens?",
          message:
            count === undefined
              ? "Every screen that this API key can reach shows the message."
              : `${count}${screens.data?.nextCursor ? " or more" : ""} ${count === 1 ? "screen shows" : "screens show"} the message.`,
          primaryAction: { title: "Post Message", style: Alert.ActionStyle.Default },
        });
        if (!ok) return false;
      }
      const headline = v.headline.trim();
      const body = (v.body ?? "").trim();
      const minutes = Number(v.minutes);
      const scope =
        v.scope === "screens"
          ? { scopeKind: "screens", screenIds: v.screenIds }
          : v.scope === "node"
            ? { scopeKind: "node", scopeNodeId: v.locationId }
            : { scopeKind: "all" };

      const toast = await showToast({ style: Toast.Style.Animated, title: "Posting the message…" });
      const fail = (error: unknown, note?: string) => {
        toast.style = Toast.Style.Failure;
        toast.title = "Brix did not post the message";
        const message = error instanceof Error ? error.message : String(error);
        toast.message = note ? `${message} ${note}` : message;
      };

      // Step 1: the design.
      let creativeId: string;
      try {
        const creative = await sendJson<{ id: string }>("POST", "/v1/creatives", {
          name: headline,
          boxes: boxes(headline, body, v.tone),
          tags: ["raycast"],
        });
        creativeId = creative.id;
      } catch (error) {
        fail(error);
        return false;
      }

      // Step 2: show it on the screens.
      let cast: { id: string; screenCount?: number };
      try {
        cast = await sendJson<{ id: string; screenCount?: number }>("POST", "/v1/casts", {
          contentKind: "creative",
          contentId: creativeId,
          contentName: headline,
          expiresAt: new Date(Date.now() + minutes * 60_000).toISOString(),
          ...scope,
        });
      } catch (error) {
        // Delete the design only when Brix refused the cast (4xx): then no
        // cast uses it. After a lost reply or a server error the cast may
        // exist, so the design stays.
        const refused = error instanceof BrixError && error.status >= 400 && error.status < 500;
        if (refused) {
          await sendJson("DELETE", `/v1/creatives/${encodeURIComponent(creativeId)}`).catch(() => undefined);
          fail(error);
        } else {
          fail(error, "Check the screens in Brix before you post again.");
        }
        return false;
      }

      toast.style = Toast.Style.Success;
      toast.title = "Message posted";
      const count = typeof cast.screenCount === "number" ? cast.screenCount : null;
      toast.message = `${count === null ? "The screens show" : `${count} ${count === 1 ? "screen shows" : "screens show"}`} it for ${minutes} min.`;
      toast.primaryAction = {
        title: "End Message Now",
        onAction: async (t) => {
          try {
            await sendJson("POST", `/v1/casts/${encodeURIComponent(cast.id)}/clear`, {});
            t.style = Toast.Style.Success;
            t.title = "Message ended";
            t.message = undefined;
          } catch (error) {
            await showFailureToast(error, { title: "Could not end the message" });
          }
        },
      };
      await popToRoot({ clearSearchBar: true });
    },
  });

  return (
    <Form
      isLoading={screens.isLoading}
      actions={
        <ActionPanel>
          {screens.error ? (
            <>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={screens.revalidate} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </>
          ) : null}
          <Action.SubmitForm title="Post Message" icon={Icon.Megaphone} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {screens.error ? (
        <Form.Description
          title="Could Not Load Screens"
          text={`${screens.error.message}\nChoose Retry, or open the extension preferences to check the API key.`}
        />
      ) : null}
      <Form.TextField title="Headline" placeholder="Team meeting at 3 pm" {...itemProps.headline} />
      <Form.TextArea title="Body" placeholder="Meet in the break room." {...itemProps.body} />
      <Form.Dropdown title="Tone" {...itemProps.tone}>
        <Form.Dropdown.Item value="announcement" title="Announcement (blue)" />
        <Form.Dropdown.Item value="alert" title="Alert (red)" />
        <Form.Dropdown.Item value="celebrate" title="Celebrate (green)" />
        <Form.Dropdown.Item value="info" title="Info (gray)" />
      </Form.Dropdown>
      <Form.Separator />
      <Form.Dropdown title="Show On" info="Only the screens that this API key can reach." {...itemProps.scope}>
        <Form.Dropdown.Item value="all" title="All screens" />
        <Form.Dropdown.Item value="screens" title="Selected screens" />
        {(locations.data ?? []).length > 0 ? (
          <Form.Dropdown.Item value="node" title="All screens at a location" />
        ) : null}
      </Form.Dropdown>
      {values.scope === "screens" ? (
        <Form.TagPicker title="Screens" {...itemProps.screenIds}>
          {(screens.data?.data ?? []).map((s: Screen) => (
            <Form.TagPicker.Item key={s.id} value={s.id} title={s.name} />
          ))}
        </Form.TagPicker>
      ) : null}
      {values.scope === "node" ? (
        <Form.Dropdown title="Location" {...itemProps.locationId}>
          {locationLabels(locations.data ?? []).map((l) => (
            <Form.Dropdown.Item key={l.id} value={l.id} title={l.label} />
          ))}
        </Form.Dropdown>
      ) : null}
      <Form.TextField
        title="Minutes on Screen"
        placeholder="60"
        info="From 1 to 1440. Then the screens go back to their usual content."
        {...itemProps.minutes}
      />
    </Form>
  );
}
