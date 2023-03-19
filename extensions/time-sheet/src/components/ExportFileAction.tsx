import { Action, Icon } from "@raycast/api";

export const ExportFileAction = (props: { onExport: () => void }) => {
    return (
        <Action
            icon={Icon.Trash}
            title="Export File"
            shortcut={{ modifiers: ["ctrl"], key: "e" }}
            onAction={props.onExport}
        />
    );
}
