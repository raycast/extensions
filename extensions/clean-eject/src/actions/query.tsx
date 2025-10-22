import { Action, Icon, Keyboard } from '@raycast/api';

export const getQueryCommand = (): string => {
  return `
    mount | awk -F ' on ' '{print $2}' | grep '^/Volumes/' | sed 's/ (.*)//' | while IFS= read -r path; do
      name=$(basename "$path")
      info=$(diskutil info "$path")

      location=$(echo "$info" | awk -F: '/Device Location/ {gsub(/^ +| +$/,"",$2); print $2}')
      [[ "$location" != "External" ]] && continue

      id=$(echo "$info" | awk -F: '/Device Identifier/ {gsub(/^ +| +$/,"",$2); print $2}')
      format=$(echo "$info" | awk -F: '/File System Personality/ {gsub(/^ +| +$/,"",$2); print $2}')
      size=$(echo "$info" | awk -F: '/Disk Size/ {gsub(/^ +| +$/,"",$2); split($2,a," "); print a[1], a[2]}')
      removable=$(echo "$info" | awk -F: '/Removable Media/ {gsub(/^ +| +$/,"",$2); print $2}')
      isRemovable=false
      [[ "$removable" == "Removable" ]] && isRemovable=true

      echo "{\\"id\\": \\"$id\\", \\"name\\": \\"$name\\", \\"path\\": \\"$path\\", \\"format\\": \\"$format\\", \\"size\\": \\"$size\\", \\"isRemovable\\": $isRemovable}"
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
