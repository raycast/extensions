import { CustomTone } from "@/hooks/useCustomTones";
import { getFullGuidelinesContent, getToneIcon, getToneSubtitle } from "../CustomToneManager.helpers";
import EntityListItem from "@/components/shared/EntityListItem";

interface ToneListItemProps {
  tone: CustomTone;
  onEdit: (tone: CustomTone) => void;
  onDelete: (tone: CustomTone) => void;
  onCreate: () => void;
}

export default function ToneListItem({ tone, onEdit, onDelete, onCreate }: ToneListItemProps) {
  return (
    <EntityListItem
      entity={tone}
      subtitle={getToneSubtitle(tone)}
      icon={getToneIcon(tone)}
      onEdit={onEdit}
      onDelete={onDelete}
      onCreate={onCreate}
      copyContent={getFullGuidelinesContent(tone)}
      entityType="tone"
    />
  );
}
