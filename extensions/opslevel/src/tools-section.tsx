import { ServiceToolFragment } from "./client";
import { ActionPanel, Action, Icon, Image } from "@raycast/api";

export default function ToolsSection({
    tools,
    onVisisted,
}: {
    tools: ServiceToolFragment[] | null | undefined;
    onVisisted: () => void;
}) {
    if (!tools) {
        return null;
    }

    return (
        <ActionPanel.Section>
            {tools.map((tool) => {
                if (!tool || !tool.displayName || !tool.url) {
                    return null;
                }

                const icon: Image.ImageLike = {
                    source: Icon.Globe,
                    fallback: Icon.Globe,
                };

                if (tool.url.toLowerCase().includes("datadog")) {
                    icon.source = "datadoghq.svg";
                }

                return (
                    <Action.OpenInBrowser
                        key={tool?.id}
                        title={tool?.displayName ?? ""}
                        url={tool?.url ?? ""}
                        icon={icon}
                        onOpen={onVisisted}
                    />
                );
            })}
        </ActionPanel.Section>
    );
}
