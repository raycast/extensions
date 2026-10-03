import { Detail, environment, showToast, Toast } from "@raycast/api";
import * as os from "node:os";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusPage } from "@/domain/status-page";
import { StatusPageSectionGroup } from "@/domain/status-page-resource";
import { useStatusPageDetail } from "@/hooks/use-status-page-detail";
import { renderStatusPageDetail } from "@/ui/status-pages/status-page-detail-renderer";
import { buildStatusPageDetailSvg } from "@/ui/status-pages/components/detail/status-page-detail-view";
import { exportSvgToClipboard } from "@/common/utils/svg-utils";
import { StatusPageActionPanel } from "@/ui/status-pages/action-panel/status-page-action-panel";

const queryClient = new QueryClient();

const LOAD_ERROR_TITLE = "## Failed to load status page details";
const LOAD_ERROR_MESSAGE = "Check your API token and network connection, then reopen the extension.";

interface StatusPageDetailProps {
  statusPage: StatusPage & { url: string };
}

export function StatusPageDetail({ statusPage }: StatusPageDetailProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusPageDetailContent statusPage={statusPage} />
    </QueryClientProvider>
  );
}

function StatusPageDetailContent({ statusPage }: StatusPageDetailProps) {
  const { sections, isLoading, isError, refresh } = useStatusPageDetail(statusPage.id);
  const [markdown, setMarkdown] = useState("");

  useEffect(() => {
    renderStatusPageDetail({ statusPage, sections, isLoading })
      .then(setMarkdown)
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        setMarkdown(`## Status page render error\n\n\`\`\`\n${message}\n\`\`\``);
      });
  }, [statusPage, sections, isLoading]);

  if (isError) {
    return <Detail markdown={[LOAD_ERROR_TITLE, LOAD_ERROR_MESSAGE].join(os.EOL)} />;
  }

  return (
    <Detail
      isLoading={isLoading || markdown === ""}
      navigationTitle={statusPage.name}
      markdown={markdown}
      actions={
        <StatusPageActionPanel
          url={statusPage.url}
          onRefresh={refresh}
          onCopyAsPng={() => copyAsPng({ statusPage, sections })}
        />
      }
    />
  );
}

async function copyAsPng(props: { statusPage: StatusPage; sections: StatusPageSectionGroup[] }) {
  const { statusPage, sections } = props;
  const toast = await showToast({ style: Toast.Style.Animated, title: "Copying to clipboard..." });

  try {
    const svg = await buildStatusPageDetailSvg({ statusPage, sections, forExport: true });
    await exportSvgToClipboard(svg, environment.supportPath);
    toast.style = Toast.Style.Success;
    toast.title = "Status page copied to clipboard";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to copy status page";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
