import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { GenerationStatus } from "./components/generation-status";
import { useBrandIdentities } from "./hooks/use-brand-identities";
import { useIntegrations } from "./hooks/use-integrations";
import { generatePost } from "./lib/notra";
import { CONTENT_TYPE_OPTIONS, LOOKBACK_WINDOW_OPTIONS } from "./schemas";
import { getErrorMessage } from "./utils";
import type { ContentTypeValue } from "./types";

interface GeneratePostFormValues {
  brandIdentityId: string;
  contentType: string;
  githubIntegrations: string[];
  includeCommits: boolean;
  includeLinearData: boolean;
  includePullRequests: boolean;
  includeReleases: boolean;
  linearIntegrations: string[];
  lookbackWindow: string;
}

export default function Command() {
  const { push } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: brandIdentities, isLoading: loadingBrands } = useBrandIdentities();
  const { data: integrations, isLoading: loadingIntegrations } = useIntegrations();

  const isLoading = loadingBrands || loadingIntegrations;

  async function handleSubmit(values: GeneratePostFormValues) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Queueing post generation...",
    });

    setIsSubmitting(true);

    try {
      const githubIds = values.githubIntegrations ?? [];
      const linearIds = values.linearIntegrations ?? [];
      const hasIntegrations = githubIds.length > 0 || linearIds.length > 0;

      const result = await generatePost({
        contentType: values.contentType as ContentTypeValue,
        lookbackWindow: values.lookbackWindow,
        brandIdentityId: values.brandIdentityId,
        ...(hasIntegrations
          ? {
              integrations: {
                ...(githubIds.length > 0 ? { github: githubIds } : {}),
                ...(linearIds.length > 0 ? { linear: linearIds } : {}),
              },
            }
          : {}),
        dataPoints: {
          includePullRequests: values.includePullRequests,
          includeCommits: values.includeCommits,
          includeReleases: values.includeReleases,
          includeLinearData: values.includeLinearData,
        },
      });

      toast.style = Toast.Style.Success;
      toast.title = "Generation queued";

      push(<GenerationStatus jobId={result.job.id} type="post" />);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to queue generation";
      toast.message = getErrorMessage(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  const contentTypeOptions = CONTENT_TYPE_OPTIONS.filter((o) => o.value !== "all");
  const githubIntegrations = integrations?.github ?? [];
  const linearIntegrations = integrations?.linear ?? [];
  const defaultBrandIdentity = (brandIdentities ?? []).find((bi) => bi.isDefault);
  const defaultBrandIdentityId = defaultBrandIdentity?.id ?? (brandIdentities ?? [])[0]?.id ?? "";

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Stars} onSubmit={handleSubmit} title="Create Content" />
        </ActionPanel>
      }
      isLoading={isLoading || isSubmitting}
      navigationTitle="Create Content"
    >
      <Form.Dropdown defaultValue="changelog" id="contentType" title="Content Type">
        {contentTypeOptions.map((option) => (
          <Form.Dropdown.Item icon={option.icon} key={option.value} title={option.title} value={option.value} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown defaultValue="last_7_days" id="lookbackWindow" title="Lookback Window">
        {LOOKBACK_WINDOW_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} title={option.title} value={option.value} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown defaultValue={defaultBrandIdentityId} id="brandIdentityId" title="Brand Identity">
        {(brandIdentities ?? []).map((bi) => (
          <Form.Dropdown.Item
            icon={Icon.Person}
            key={bi.id}
            title={`${bi.name}${bi.isDefault ? " (Default)" : ""}`}
            value={bi.id}
          />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      {githubIntegrations.length > 0 && (
        <Form.TagPicker id="githubIntegrations" title="GitHub Repos">
          {githubIntegrations.map((gh) => (
            <Form.TagPicker.Item icon={Icon.Code} key={gh.id} title={gh.displayName} value={gh.id} />
          ))}
        </Form.TagPicker>
      )}

      {linearIntegrations.length > 0 && (
        <Form.TagPicker id="linearIntegrations" title="Linear Teams">
          {linearIntegrations.map((ln) => (
            <Form.TagPicker.Item icon={Icon.List} key={ln.id} title={ln.displayName} value={ln.id} />
          ))}
        </Form.TagPicker>
      )}

      <Form.Separator />

      <Form.Checkbox defaultValue={true} id="includePullRequests" label="Include Pull Requests" />
      <Form.Checkbox defaultValue={true} id="includeCommits" label="Include Commits" />
      <Form.Checkbox defaultValue={true} id="includeReleases" label="Include Releases" />
      <Form.Checkbox defaultValue={false} id="includeLinearData" label="Include Linear Data" />
    </Form>
  );
}
