import { Action, Icon, Keyboard } from '@raycast/api';

export const getQueryCommand = (): string => {
  return `
    printf "["

    first=true

    mount | awk -F ' on ' '{print $2}' | grep '^/Volumes/' | sed 's/ (.*)//' | while IFS= read -r path; do
      info=$(diskutil info "$path")

      id=$(echo "$info" | grep "Device Identifier:" | sed 's/.*Device Identifier: *//')
      name=$(basename "$path")
      format=$(echo "$info" | grep "File System Personality:" | sed 's/.*File System Personality: *//')
      protocol=$(echo "$info" | grep "Protocol:" | sed 's/.*Protocol: *//')
      size=$(echo "$info" | grep "Disk Size:" | sed -E 's/.*Disk Size: *([0-9.]+) *([A-Za-z]+).*/\\1 \\2/')
      removable=$(echo "$info" | grep "Removable Media:" | sed 's/.*Removable Media: *//')

      isRemovable=false
      [[ "$removable" == "Removable" ]] && isRemovable=true

      if [[ "$first" == true ]]; then
        first=false
      else
        printf ","
      fi

      printf "%s" "{\\"id\\": \\"$id\\", \\"name\\": \\"$name\\", \\"path\\": \\"$path\\", \\"format\\": \\"$format\\", \\"protocol\\": \\"$protocol\\", \\"size\\": \\"$size\\", \\"isRemovable\\": $isRemovable}"
    done

    printf "]"
  `;
};

type QueryActionProps = {
  onQuery?: () => void;
};

export const QueryAction = ({ onQuery }: QueryActionProps) => {
  return (
    <Action
      icon={Icon.ArrowClockwise}
      title="Refresh Device List"
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={onQuery}
    />
  );
};
