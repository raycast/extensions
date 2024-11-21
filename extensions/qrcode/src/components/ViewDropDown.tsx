import { List } from "@raycast/api";
import { useTranslation } from "../i18n";

export function DetailViewDropdown(props: { onDetailViewChange: (newValue: string) => void }) {
  const { onDetailViewChange } = props;
  const t = useTranslation();
  return (
    <List.Dropdown tooltip="Select Detail View" storeValue={true} onChange={onDetailViewChange}>
      <List.Dropdown.Section>
        <List.Dropdown.Item key="qrcode" title={t.qrcode} value="qrcode" />
        <List.Dropdown.Item key="metadata" title={t.metadata} value="metadata" />
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
