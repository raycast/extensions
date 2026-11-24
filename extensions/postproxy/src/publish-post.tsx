import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useForm, usePromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { groupProfiles, profileOptionTitle } from "./lib/grouping";
import { useProfileGroups, useProfiles } from "./lib/hooks";
import {
  buildPlatforms,
  eligiblePlacementNetworks,
  eligiblePlacementProfiles,
  loadPlacementsByNetwork,
  overSelectedMandatoryNetworks,
  PLACEMENT_META,
  rawPlacementIds,
  requiresPlacement,
  validatePlacements,
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
  // A failed profiles load (e.g. a bad API key) is surfaced by useProfiles' own failure toast; the Form
  // can't host an EmptyView, so we don't add a second toast here.
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
        // A selected profile may have been disconnected since selection. Block if ANY is missing rather
        // than silently narrowing the post's destinations (dropping one could remove the only profile on
        // a whole network); the user reselects the still-connected profiles explicitly.
        const requestedIds = new Set(v.profiles);
        const selectedNow = profiles.filter((p) => requestedIds.has(p.id));
        if (selectedNow.length !== requestedIds.size) {
          toast.style = Toast.Style.Failure;
          toast.title = "Profiles unavailable";
          toast.message = "One or more selected profiles are no longer connected. Reselect and try again.";
          return;
        }
        const platforms = buildPlatforms(v.platformParams, networkPlacements, eligiblePlacementNetworks(selectedNow));
        // Validate the final payload against a fresh fetch for the current profiles: catches
        // multi-profile ambiguity, raw-JSON placements, and stale/invalid ids alike.
        const placementError = await validatePlacements(platforms, selectedNow);
        if (placementError) {
          toast.style = Toast.Style.Failure;
          toast.title = "Placement";
          toast.message = placementError;
          return;
        }
        const result = await createPost({
          body: v.body,
          profiles: selectedNow.map((profile) => profile.id),
          media: v.media,
          scheduledAt: scheduled?.toISOString(),
          draft: v.draft,
          platforms,
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
  const overSelectedNetworks = overSelectedMandatoryNetworks(selectedProfiles);
  const placementKey = eligibleProfiles
    .map((p) => p.id)
    .sort()
    .join(",");
  const placementTargets = useMemo(() => eligibleProfiles, [placementKey]);
  const { data: placements, revalidate: revalidatePlacements } = usePromise(loadPlacementsByNetwork, [
    placementTargets,
  ]);
  const placementsByNetwork = placements?.byNetwork;
  const placementNetworks = placementsByNetwork
    ? Object.keys(placementsByNetwork).filter((n) => PLACEMENT_META[n])
    : [];
  // Placement ids set via raw Platform Parameters, so an untouched dropdown reflects what will be sent.
  const rawPlacements = useMemo(() => rawPlacementIds(values.platformParams), [values.platformParams]);

  // A failed placements fetch would otherwise render no dropdown, stranding a mandatory network at
  // submit. Surface it with a retry so the user can recover instead of being stuck on "Choose a …".
  useEffect(() => {
    const placementErrors = placements?.errors ?? [];
    if (placementErrors.length > 0) {
      showFailureToast(placementErrors[0], {
        title: "Couldn't load some placement options",
        primaryAction: {
          title: "Retry",
          onAction: (toast) => {
            toast.hide();
            revalidatePlacements();
          },
        },
      });
    }
  }, [placements, revalidatePlacements]);

  // When placements change (e.g. the profile on a network was swapped), drop any selection that's no
  // longer valid — reset it to empty so the dropdown shows "Choose…" again. Never auto-pick a default.
  useEffect(() => {
    if (!placementsByNetwork) return;
    setNetworkPlacements((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const net of Object.keys(prev)) {
        const list = placementsByNetwork[net];
        // Only clear a selection when a SUCCESSFUL fetch proves it's stale. Absence means the network
        // isn't eligible yet or its fetch failed — neither should wipe the user's choice (a transient
        // picker failure must not silently drop it, and buildPlatforms already ignores selections for
        // non-eligible networks at submit).
        if (!list) continue;
        const validIds = new Set(list.map((p) => p.id ?? ""));
        if (prev[net] && !validIds.has(prev[net])) {
          next[net] = "";
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [placementsByNetwork]);

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

      {placementNetworks.length > 0 || overSelectedNetworks.length > 0 ? <Form.Separator /> : null}
      {placementNetworks.map((net) => {
        const list = placementsByNetwork?.[net] ?? [];
        // Optional networks (LinkedIn) can always post as the personal profile. Offer that explicitly
        // unless the API already returns a personal (null-id) option, so the user can pick it back.
        const needsPersonalOption = !requiresPlacement(net) && !list.some((placement) => !placement.id);
        return (
          <Form.Dropdown
            key={net}
            id={`placement_${net}`}
            title={PLACEMENT_META[net].label}
            value={networkPlacements[net] ?? rawPlacements[net] ?? ""}
            onChange={(value) => setNetworkPlacements((prev) => ({ ...prev, [net]: value }))}
          >
            {/* Mandatory networks start unselected so the user must choose (no silent default). */}
            {requiresPlacement(net) ? (
              <Form.Dropdown.Item value="" title={`Choose a ${PLACEMENT_META[net].label}…`} />
            ) : needsPersonalOption ? (
              <Form.Dropdown.Item value="" title="Personal Profile" />
            ) : null}
            {list.map((placement) => (
              <Form.Dropdown.Item
                key={placement.id ?? placement.name}
                value={placement.id ?? ""}
                title={placement.name}
                icon={platformIcon(net)}
              />
            ))}
          </Form.Dropdown>
        );
      })}
      {overSelectedNetworks.length > 0 ? (
        <Form.Description
          text={`${overSelectedNetworks
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
