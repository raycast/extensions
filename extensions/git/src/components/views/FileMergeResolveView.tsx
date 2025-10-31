import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  Image,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useMemo } from "react";
import { ConflictSegment } from "../../types";
import { useConflictResolver } from "../../hooks/useConflictResolver";
import { RepositoryContext } from "../../open-repository";
import { basename } from "path";
import { FileManagerActions } from "../actions/FileActions";
import { existsSync } from "fs";
import { CopyToClipboardMenuAction } from "../actions/CopyToClipboardMenuAction";

export default function FileMergeResolveView(context: RepositoryContext & { filePath: string }) {
  const { pop } = useNavigation();
  const { segments, isLoading, resolveSegment, applyResolution } = useConflictResolver(context.filePath);

  const setAllResolution = (type: "current" | "incoming") => {
    for (const segment of segments) {
      resolveSegment(segment.id, type);
    }
  };

  const applyResolutions = async () => {
    const confirmed = await confirmAlert({
      title: "Apply Resolved Changes",
      message: `Are you sure you want to apply selected resolutions to "${basename(context.filePath)}"?`,
      primaryAction: {
        title: "Apply",
        style: Alert.ActionStyle.Default,
      },
    });

    if (!confirmed) return;

    try {
      applyResolution();

      await showToast({
        style: Toast.Style.Success,
        title: "Conflicts resolved",
        message: `File "${basename(context.filePath)}" has been updated`,
      });

      const isAllResolved = segments.every((segment) => segment.resolution !== null);
      if (isAllResolved) {
        await context.gitManager.stageFile(context.filePath);
        context.status.revalidate();
      }
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to apply resolutions",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <List isLoading={isLoading} navigationTitle={"Resolve Conflicts"} isShowingDetail={true}>
      {segments.length === 0 ? (
        <List.EmptyView
          title="No conflicts found"
          description="This file doesn't contain any conflict markers."
          icon={Icon.CheckCircle}
        />
      ) : (
        <>
          {segments.map((segment) => (
            <List.Section key={segment.id} title={`Lines ${segment.startLine}-${segment.endLine}`}>
              <ConflictSegmentOptionItem
                filePath={context.filePath}
                segment={segment}
                type="current"
                onSetResolution={(resolution) => resolveSegment(segment.id, resolution)}
                onSetAllResolution={setAllResolution}
                onApplyAll={applyResolutions}
              />
              <ConflictSegmentOptionItem
                filePath={context.filePath}
                segment={segment}
                type="incoming"
                onSetResolution={(resolution) => resolveSegment(segment.id, resolution)}
                onSetAllResolution={setAllResolution}
                onApplyAll={applyResolutions}
              />
            </List.Section>
          ))}
        </>
      )}
    </List>
  );
}

function ConflictSegmentOptionItem({
  filePath,
  segment,
  type,
  onSetResolution,
  onSetAllResolution,
  onApplyAll,
}: {
  filePath: string;
  segment: ConflictSegment;
  type: "current" | "incoming";
  onSetResolution: (type: "current" | "incoming" | null) => void;
  onSetAllResolution: (type: "current" | "incoming") => void;
  onApplyAll?: () => void;
}) {
  const label = type === "current" ? segment.current.label : segment.incoming.label;
  const content = type === "current" ? segment.current.content : segment.incoming.content;

  const title = useMemo(() => {
    const firstLine = content.split("\n").find((line) => line.trim() !== "");
    return `${firstLine ? `${firstLine}` : "<empty>"}`;
  }, [type]);

  const icon: { value: Image.ImageLike; tooltip: string } = useMemo(() => {
    if (segment.resolution === null) {
      return {
        tooltip: "Unresolved",
        value: { source: `tag-solid.svg`, tintColor: Color.SecondaryText },
      };
    }
    if (segment.resolution === type) {
      return {
        tooltip: "Selected",
        value: { source: `tag-solid.svg`, tintColor: Color.Blue },
      };
    }
    return {
      tooltip: "Unselected",
      value: { source: `tag-outline.svg`, tintColor: Color.SecondaryText },
    };
  }, [segment.resolution, type]);

  const detailMarkdown = useMemo(() => {
    return [
      `${label}`,
      "~~~diff",
      `  ${segment.beforeContent.replace(/\n/g, `\n  `)}`,
      content ? `+ ${content.replace(/\n/g, `\n+ `)}` : undefined,
      `  ${segment.afterContent.replace(/\n/g, `\n  `)}`,
      "~~~",
    ]
      .filter(Boolean)
      .join("\n");
  }, [type, segment]);

  return (
    <List.Item
      title={{
        value: title,
        tooltip: label,
      }}
      icon={icon}
      detail={<List.Item.Detail markdown={detailMarkdown} />}
      quickLook={existsSync(filePath) ? { path: filePath, name: basename(filePath) } : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={`Lines ${segment.startLine}-${segment.endLine}`}>
            <SelectSegmentAction segment={segment} type={type} onSetResolution={onSetResolution} />
            <SelectSegmentAction
              segment={segment}
              type={type === "current" ? "incoming" : "current"}
              onSetResolution={onSetResolution}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="All Lines">
            <Action title={`Select ${segment.current.label}`} onAction={() => onSetAllResolution("current")} />
            <Action title={`Select ${segment.incoming.label}`} onAction={() => onSetAllResolution("incoming")} />
          </ActionPanel.Section>

          <ActionPanel.Section title={basename(filePath)}>
            <Action
              title="Save Resolved Changes"
              icon={Icon.SaveDocument}
              onAction={onApplyAll}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <FileManagerActions filePath={filePath} />
            <CopyToClipboardMenuAction
              contents={[
                { title: "File Path", content: `${filePath}:${segment.startLine}`, icon: Icon.Document },
                { title: "Selected Content", content: content, icon: Icon.Text },
              ]}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function SelectSegmentAction({
  segment,
  type,
  onSetResolution,
}: {
  segment: ConflictSegment;
  type: "current" | "incoming";
  onSetResolution: (type: "current" | "incoming" | null) => void;
}) {
  const label = type === "current" ? segment.current.label : segment.incoming.label;

  if (segment.resolution !== type) {
    return (
      <Action
        title={`Select ${label}`}
        icon={{ source: `tag-solid.svg`, tintColor: Color.Blue }}
        onAction={() => onSetResolution(type)}
        shortcut={{ modifiers: ["cmd"], key: type === "current" ? "[" : "]" }}
      />
    );
  } else {
    return (
      <Action
        title={`Deselect ${label}`}
        icon={{ source: `tag-outline.svg`, tintColor: Color.SecondaryText }}
        onAction={() => onSetResolution(null)}
        shortcut={{ modifiers: ["cmd"], key: type === "current" ? "[" : "]" }}
      />
    );
  }
}
