// Material Types

interface MaterialItemData extends LocalizedBase, LocalizedDescription {
  icon: string;
  type: string;
}

type MaterialItemMap = Record<string, MaterialItemData>;
