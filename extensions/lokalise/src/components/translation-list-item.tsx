import type { ReactElement } from "react";
import { List, ActionPanel, Action, Icon, openExtensionPreferences } from "@raycast/api";
import { DuplicateTranslationForm } from "./duplicate-translation-form";
import { TranslationListItemDetail } from "./translation-list-item-detail";
import { ToggleDetailAction } from "./actions/toggle-detail-action";

interface KeyData {
  keyId: number;
  keyName: string;
  defaultTranslation?: string;
  mainTranslation?: string;
  platforms: string[];
  isPlural: boolean;
  description?: string;
}

interface TranslationListItemProps {
  keyData: KeyData;
  target: ReactElement;
  showingDetail: boolean;
  onToggleDetail: () => void;
  onSync: () => void;
}

export function TranslationListItem({
  keyData,
  target,
  showingDetail,
  onToggleDetail,
  onSync,
}: TranslationListItemProps) {
  return (
    <List.Item
      key={keyData.keyId}
      id={keyData.keyId.toString()}
      title={keyData.keyName}
      subtitle={!showingDetail ? keyData.defaultTranslation || undefined : undefined}
      accessories={
        !showingDetail
          ? [
              { text: keyData.isPlural ? "Plural" : "", icon: keyData.isPlural ? Icon.Document : undefined },
              { text: keyData.platforms.join(", ") || "" },
            ]
          : undefined
      }
      detail={showingDetail ? <TranslationListItemDetail keyId={keyData.keyId} /> : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {!showingDetail ? (
              <>
                <Action.Push title="View Details" icon={Icon.Eye} target={target} />
                <ToggleDetailAction isShowingDetail={showingDetail} onToggle={onToggleDetail} />
              </>
            ) : (
              <>
                <Action.CopyToClipboard
                  title="Copy Key Name"
                  content={keyData.keyName}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
                />
                <ToggleDetailAction isShowingDetail={showingDetail} onToggle={onToggleDetail} />
                <Action.Push title="View Details" icon={Icon.Eye} target={target} />
              </>
            )}
            {keyData.mainTranslation && (
              <Action.CopyToClipboard
                title="Copy Translation"
                content={keyData.mainTranslation}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            )}
            <Action.Push
              title="Duplicate Key"
              icon={Icon.Duplicate}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              target={<DuplicateTranslationForm keyId={keyData.keyId} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Sync Now"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onSync}
            />
            <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
