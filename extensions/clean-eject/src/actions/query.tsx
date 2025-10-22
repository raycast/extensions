import { Action, Icon, Keyboard } from '@raycast/api';

export const getQueryCommand = (): string => {
  return `
    df -Hl | awk '$NF ~ "^/Volumes/" && $NF !~ "^/System/Volumes/" {print $NF}' | while read -r path; do
      info=$(diskutil info "$path")
      location=$(echo "$info" | awk -F: '/Device Location/ {gsub(/^ +| +$/,"",$2); print $2}')

      if [[ "$location" == "External" ]]; then
        name=$(basename "$path")
        id=$(echo "$info" | awk -F: '/Device Identifier/ {gsub(/^ +| +$/,"",$2); print $2}')
        format=$(echo "$info" | awk -F: '/File System Personality/ {gsub(/^ +| +$/,"",$2); print $2}')
        size=$(echo "$info" | awk -F: '/Disk Size/ {gsub(/^ +| +$/,"",$2); split($2,a," "); print a[1], a[2]}')

        echo "{\\"id\\": \\"$id\\", \\"name\\": \\"$name\\", \\"path\\": \\"$path\\", \\"format\\": \\"$format\\", \\"size\\": \\"$size\\"}"
      fi
    done
  `;
};

type QueryActionProps = {
  onQuery?: () => void;
};

export const QueryAction = ({ onQuery }: QueryActionProps) => {
  return (
    <Action
      icon={Icon.ArrowClockwise}
      title="Refresh Drive List"
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={onQuery}
    />
  );
};
