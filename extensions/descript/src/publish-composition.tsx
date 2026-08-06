import { useEffect, useMemo } from "react";

import {
  Action,
  ActionPanel,
  Form,
  Icon,
  LaunchType,
  Toast,
  launchCommand,
  showToast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";

import { renderAuthError } from "./lib/auth-ui";
import { descript } from "./lib/client";
import { onLoadError } from "./lib/load-errors";
import { showErrorToast } from "./lib/toast";
import type { DescriptComposition, PublishAccessLevel, PublishMediaType, PublishResolution } from "./lib/types";

const DEFAULT_ACCESS = "__default__";

const RESOLUTIONS: PublishResolution[] = ["480p", "720p", "1080p", "1440p", "4K"];

type Props = {
  projectId: string;
  projectName: string;
  /**
   * Composition the form should default to. When unset, the first composition
   * in the list is selected. Useful when launching the form from a specific
   * composition row so the user doesn't have to re-pick.
   */
  presetCompositionId?: string;
  /** Optional pre-fetched compositions; otherwise the form fetches them. */
  compositions?: DescriptComposition[];
};

// `mediaType` / `resolution` stay as plain strings because Form.Dropdown's
// onChange takes `string`, which is incompatible with narrower union types
// in useForm's itemProps. They're validated against the unions on submit.
type Values = {
  compositionId: string;
  mediaType: string;
  resolution: string;
  accessLevel: string;
};

/**
 * Publishes one composition. Republish identity is
 * `(project_id, composition_id, media_type)` per the API, so the form always
 * requires a composition id (republish can reuse the same share URL).
 */
export default function PublishCompositionForm({
  projectId,
  projectName,
  presetCompositionId,
  compositions: presetComps,
}: Props) {
  const { pop } = useNavigation();

  const {
    data: detail,
    isLoading: loadingDetail,
    error: detailError,
    revalidate: revalidateDetail,
  } = useCachedPromise(async (id: string) => descript.getProject(id), [projectId], {
    keepPreviousData: true,
    execute: !presetComps,
    onError: onLoadError("Could not load project"),
  });

  const compositions: DescriptComposition[] = useMemo(() => {
    if (presetComps && presetComps.length > 0) return presetComps;
    if (Array.isArray(detail?.compositions)) return detail!.compositions;
    return [];
  }, [presetComps, detail]);

  const initialCompositionId = useMemo(() => {
    if (presetCompositionId && compositions.some((c) => c.id === presetCompositionId)) {
      return presetCompositionId;
    }
    return compositions[0]?.id ?? "";
  }, [presetCompositionId, compositions]);

  const { handleSubmit, itemProps, values, setValue } = useForm<Values>({
    initialValues: {
      compositionId: initialCompositionId,
      mediaType: "Video",
      resolution: "1080p",
      accessLevel: DEFAULT_ACCESS,
    },
    validation: {
      compositionId: FormValidation.Required,
    },
    onSubmit: startPublish,
  });

  useEffect(() => {
    if (!values.compositionId && initialCompositionId) {
      setValue("compositionId", initialCompositionId);
    }
  }, [initialCompositionId, values.compositionId, setValue]);

  async function startPublish(form: Values) {
    const payload: Record<string, unknown> = {
      project_id: projectId,
      composition_id: form.compositionId,
      media_type: form.mediaType as PublishMediaType,
    };
    if (form.mediaType === "Video") {
      payload.resolution = form.resolution as PublishResolution;
    }
    if (form.accessLevel && form.accessLevel !== DEFAULT_ACCESS) {
      payload.access_level = form.accessLevel as PublishAccessLevel;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Starting publish…" });

    try {
      const job = await descript.startPublishJob(payload);

      toast.style = Toast.Style.Success;
      toast.title = "Publish started";
      toast.message = `Job ${job.job_id}`;
      toast.primaryAction = {
        title: "Open in Recent Jobs",
        onAction: async () => {
          await launchCommand({ name: "recent-jobs", type: LaunchType.UserInitiated });
        },
      };

      try {
        await launchCommand({
          name: "descript-activity",
          type: LaunchType.Background,
          context: { reason: "post-job-kickoff" },
        });
      } catch {
        // Menu-bar nudge is best-effort; the next manifest wake will catch up.
      }

      pop();
    } catch (error) {
      await toast.hide();
      await showErrorToast("Publish failed", error);
    }
  }

  const authError = renderAuthError(detailError, revalidateDetail);
  if (authError) return authError;

  const showResolution = values.mediaType === "Video";

  return (
    <Form
      isLoading={loadingDetail}
      navigationTitle="Publish Composition"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Globe} title="Publish" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`Publishing a composition from "${projectName}". Republishing the same composition (same media type) reuses its existing share URL.`}
      />

      <Form.Dropdown
        {...itemProps.compositionId}
        title="Composition"
        info="Republish identity is keyed on this composition + media type, so the same combo always produces the same share URL."
      >
        {compositions.length === 0 ? (
          <Form.Dropdown.Item value="" title={loadingDetail ? "Loading compositions…" : "No compositions found"} />
        ) : (
          compositions.map((comp) => (
            <Form.Dropdown.Item
              key={comp.id}
              value={comp.id}
              title={comp.name || comp.id}
              icon={comp.media_type === "audio" ? Icon.SpeechBubble : Icon.Video}
            />
          ))
        )}
      </Form.Dropdown>

      <Form.Dropdown {...itemProps.mediaType} title="Media Type">
        <Form.Dropdown.Item value="Video" title="Video" icon={Icon.Video} />
        <Form.Dropdown.Item value="Audio" title="Audio" icon={Icon.SpeechBubble} />
      </Form.Dropdown>

      {showResolution ? (
        <Form.Dropdown {...itemProps.resolution} title="Resolution">
          {RESOLUTIONS.map((r) => (
            <Form.Dropdown.Item key={r} value={r} title={r} />
          ))}
        </Form.Dropdown>
      ) : null}

      <Form.Dropdown
        {...itemProps.accessLevel}
        title="Access"
        info="Leave on default to use the drive's configured publish setting."
      >
        <Form.Dropdown.Item value={DEFAULT_ACCESS} title="Use drive default" />
        <Form.Dropdown.Item value="public" title="Public" icon={Icon.Globe} />
        <Form.Dropdown.Item value="unlisted" title="Unlisted" icon={Icon.Link} />
        <Form.Dropdown.Item value="drive" title="Drive members" icon={Icon.PersonCircle} />
        <Form.Dropdown.Item value="private" title="Private" icon={Icon.Lock} />
      </Form.Dropdown>
    </Form>
  );
}
