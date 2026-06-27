import { Action, ActionPanel, Detail, Icon } from '@raycast/api';
import { usePromise } from '@raycast/utils';

import { type DealBriefing, getDealBriefing } from './lib/api';
import { AuthError } from './lib/oauth';
import { LoginPromptDetail } from './lib/login-prompt';
import { getWorkspaceUrl } from './lib/preferences';

const buildMarkdown = (
  data: DealBriefing | undefined,
  isLoading: boolean,
  error: Error | undefined,
): string => {
  if (isLoading)
    return "# Today's Briefing\n\n_Pulling together your pipeline…_";
  if (error) return `# Today's Briefing\n\n⚠️ ${error.message}`;
  if (!data) return "# Today's Briefing\n\nNo briefing available.";

  if (!data.summary?.trim()) {
    return "# Today's Briefing\n\n✅ Your pipeline is clear — nothing needs attention today.";
  }

  return `# Today's Briefing\n\n${data.summary}`;
};

export default function Command() {
  const { data, isLoading, error, revalidate } = usePromise(getDealBriefing);

  if (error instanceof AuthError) {
    return <LoginPromptDetail />;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={buildMarkdown(data, isLoading, error)}
      metadata={
        data ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Deals needing attention"
              text={`${data.atRiskCount}`}
              icon={data.atRiskCount > 0 ? Icon.Warning : Icon.CheckCircle}
            />
            <Detail.Metadata.Label
              title="Generated"
              text={data.generatedDate}
            />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
          />
          <Action.OpenInBrowser
            title="Open Deserveos"
            url={getWorkspaceUrl()}
          />
        </ActionPanel>
      }
    />
  );
}
