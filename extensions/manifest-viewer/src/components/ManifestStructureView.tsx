import React from "react";
import { Action, List, Icon } from "@raycast/api";
import { ManifestLineItem } from "../utils/types";

interface ManifestStructureViewProps {
  isLoading: boolean;
  lineItems: ManifestLineItem[];
  onNavigate: (url: string) => void;
  renderActions: (extras?: React.ReactElement[]) => React.ReactElement;
}

export default function ManifestStructureView({
  isLoading,
  lineItems,
  onNavigate,
  renderActions,
}: ManifestStructureViewProps) {
  return (
    <List isLoading={isLoading} navigationTitle="Content Structure" searchBarPlaceholder="Parsed lines">
      {lineItems.length === 0 ? (
        <List.EmptyView
          title="No Parsed Items"
          description="This file does not contain any detectable links or tags."
          actions={renderActions()}
        />
      ) : (
        <List.Section title="Lines">
          {lineItems.map((item, index) => {
            const title = item.displayName || item.uri || item.line;
            const subtitle = item.uri && item.displayName ? item.uri : item.uri !== title ? item.uri : undefined;

            return (
              <List.Item
                key={`${item.lineNumber}-${index}`}
                title={title}
                accessories={[{ text: subtitle }]}
                actions={
                  item.isInteractive && item.resolvedUri
                    ? renderActions([
                        <Action
                          key="navigate"
                          title="Open Linked Resource"
                          icon={Icon.ArrowRight}
                          onAction={() => onNavigate(item.resolvedUri!)}
                        />,
                        <Action.CopyToClipboard
                          key="copy-link"
                          content={item.resolvedUri}
                          title="Copy Linked URL"
                          icon={Icon.Clipboard}
                        />,
                      ])
                    : renderActions()
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
