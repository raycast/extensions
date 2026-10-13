import { Form } from "@raycast/api";
import { AWS_REGIONS, CUSTOM_REGION_VALUE } from "../lib/aws-regions";

interface RegionFieldProps {
  preset: string;
  custom: string;
  onPresetChange: (value: string) => void;
  onCustomChange: (value: string) => void;
}

/** SSO Region picker: known AWS regions in a dropdown, plus a "Custom..." escape hatch for
 * regions AWS has added since this list was last updated. */
export function RegionField({
  preset,
  custom,
  onPresetChange,
  onCustomChange,
}: RegionFieldProps) {
  return (
    <>
      <Form.Dropdown
        id="ssoRegionPreset"
        title="SSO Region"
        value={preset}
        onChange={onPresetChange}
      >
        {AWS_REGIONS.map((region) => (
          <Form.Dropdown.Item
            key={region.value}
            value={region.value}
            title={`${region.value} — ${region.title}`}
          />
        ))}
        <Form.Dropdown.Item value={CUSTOM_REGION_VALUE} title="Custom..." />
      </Form.Dropdown>
      {preset === CUSTOM_REGION_VALUE && (
        <Form.TextField
          id="ssoRegionCustom"
          title="Custom Region"
          placeholder="e.g. ap-southeast-5"
          value={custom}
          onChange={onCustomChange}
        />
      )}
    </>
  );
}
