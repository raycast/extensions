import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useForm, usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { groupProfiles, profileOptionTitle } from "./lib/grouping";
import { useProfileGroups, useProfiles } from "./lib/hooks";
import {
  blockedPlacementNetworks,
  buildPlatforms,
  eligiblePlacementProfiles,
  loadPlacementsByNetwork,
  PLACEMENT_META,
  requiresPlacement,
  resolvePlacements,
} from "./lib/placements";
import { createPost } from "./lib/postproxy";
import { platformIcon, platformLabel } from "./lib/platforms";

interface FormValues {
  body: string;
  profiles: string[];
  media: string[];
  scheduledAt: Date | null;
  draft: boolean;
  platformParams: string;
}

export default function PublishPost() {
  const { data: profiles, isLoading } = useProfiles();
  const { data: groups } = useProfileGroups();
  const { pop } = useNavigation();

  // Per-network placement selections (Facebook Page / LinkedIn Org / Pinterest Board / Telegram Channel).
  const [networkPlacements, setNetworkPlacements] = useState<Record<string, string>>({});

  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    initialValues: { body: "", profiles: [], media: [], scheduledAt: null, draft: false, platformParams: "" },
    async onSubmit(v) {
      const scheduled = v.scheduledAt ?? undefined;
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: v.draft ? "Saving draft…" : scheduled ? "Scheduling…" : "Publishing…",
      });
      try {
        const selectedNow = profiles.filter((p) => v.profiles.includes(p.id));
        // Block publishing when a mandatory-placement network has 2+ selected profiles: the API takes
        // one placement per network, so those profiles can't each get their required destination.
        const blocked = blockedPlacementNetworks(selectedNow);
        if (blocked.length > 0) {
          toast.style = Toast.Style.Failure;
          toast.title = "Publish separately";
          toast.message = `${blocked
            .map(platformLabel)
            .join(
              ", ",
            )}: multiple profiles on this network each need their own placement. Publish them in separate posts.`;
          return;
        }
        // Resolve placements fresh for the currently-selected (single-profile) networks. Mandatory
        // placements that can't be loaded (failed/empty request) or whose selection is no longer
        // valid produce a clear error instead of publishing without one or to a wrong destination.
        const eligibleNow = eligiblePlacementProfiles(selectedNow);
        const resolution = await resolvePlacements(eligibleNow, networkPlacements);
        if (!resolution.ok) {
          toast.style = Toast.Style.Failure;
          toast.title = "Placement required";
          toast.message = resolution.message;
          return;
        }
        const result = await createPost({
          body: v.body,
          profiles: v.profiles,
          media: v.media,
          scheduledAt: scheduled?.toISOString(),
          draft: v.draft,
          platforms: buildPlatforms(v.platformParams, resolution.placements),
        });
        toast.style = Toast.Style.Success;
        toast.title = v.draft ? "Draft saved" : `Post ${result.status}`;
        pop();
      } catch (error) {
        await showFailureToast(error, { title: "Failed to publish" });
      }
    },
    validation: {
      body: FormValidation.Required,
      profiles: (value) => (!value || value.length === 0 ? "Pick at least one profile" : undefined),
      platformParams: (value) => {
        const raw = (value ?? "").trim();
        if (!raw || raw === "{}") return undefined;
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          return "Invalid JSON";
        }
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return "Must be a JSON object";
        for (const val of Object.values(parsed as Record<string, unknown>)) {
          if (!val || typeof val !== "object" || Array.isArray(val)) {
            return "Each platform must map to a JSON object";
          }
        }
        return undefined;
      },
    },
  });

  // Placements only for networks where exactly one profile is selected (per-network API limitation).
  const selectedIds = values.profiles ?? [];
  const selectedProfiles = profiles.filter((p) => selectedIds.includes(p.id));
  const eligibleProfiles = eligiblePlacementProfiles(selectedProfiles);
  const blockedNetworks = blockedPlacementNetworks(selectedProfiles);
  const placementKey = eligibleProfiles
    .map((p) => p.id)
    .sort()
    .join(",");
  const placementTargets = useMemo(() => eligibleProfiles, [placementKey]);
  const { data: placementsByNetwork } = usePromise(loadPlacementsByNetwork, [placementTargets]);
  const placementNetworks = placementsByNetwork
    ? Object.keys(placementsByNetwork).filter((n) => PLACEMENT_META[n])
    : [];

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Publish" icon={Icon.Upload} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Body" placeholder="What's happening?" {...itemProps.body} />
      <Form.TagPicker title="Profiles" {...itemProps.profiles}>
        {groupProfiles(profiles, groups).flatMap((group) =>
          group.profiles.map((profile) => (
            <Form.TagPicker.Item
              key={profile.id}
              value={profile.id}
              icon={platformIcon(profile.platform)}
              title={profileOptionTitle(profile, { showId: false, group: group.name })}
            />
          )),
        )}
      </Form.TagPicker>

      {placementNetworks.length > 0 || blockedNetworks.length > 0 ? <Form.Separator /> : null}
      {placementNetworks.map((net) => (
        <Form.Dropdown
          key={net}
          id={`placement_${net}`}
          title={PLACEMENT_META[net].label}
          value={networkPlacements[net] ?? ""}
          onChange={(value) => setNetworkPlacements((prev) => ({ ...prev, [net]: value }))}
        >
          {/* Mandatory networks start unselected so the user must choose (no silent default). */}
          {requiresPlacement(net) ? (
            <Form.Dropdown.Item value="" title={`Choose a ${PLACEMENT_META[net].label}…`} />
          ) : null}
          {(placementsByNetwork?.[net] ?? []).map((placement) => (
            <Form.Dropdown.Item
              key={placement.id ?? placement.name}
              value={placement.id ?? ""}
              title={placement.name}
              icon={platformIcon(net)}
            />
          ))}
        </Form.Dropdown>
      ))}
      {blockedNetworks.length > 0 ? (
        <Form.Description
          text={`${blockedNetworks
            .map(platformLabel)
            .join(
              ", ",
            )}: you selected multiple profiles on this network, and the API applies one placement per network. Publishing is blocked — post those profiles in separate posts to target different pages/boards/organizations/channels.`}
        />
      ) : null}

      <Form.Separator />
      <Form.FilePicker title="Media" allowMultipleSelection {...itemProps.media} />
      <Form.DatePicker title="Schedule" {...itemProps.scheduledAt} />
      <Form.Checkbox label="Save as draft (don't publish yet)" {...itemProps.draft} />

      <Form.Separator />
      <Form.TextArea
        title="Platform Parameters"
        placeholder={'{ "instagram": { "format": "reel" }, "youtube": { "title": "My video" } }'}
        info="Optional raw JSON of per-platform options, keyed by network. Placements above are merged into this."
        {...itemProps.platformParams}
      />
      <Form.Description text="Leave Schedule empty to publish immediately. Attach media or leave empty for a text post." />
    </Form>
  );
}
