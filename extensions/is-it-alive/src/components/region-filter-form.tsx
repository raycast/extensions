import { Form } from "@raycast/api";
import type { CloudProvider } from "@/lib/region-catalog";
import {
  getRegionCatalog,
  sanitizeMonitoredRegions,
} from "@/lib/region-catalog";

export function RegionFilterFields({
  provider,
  monitoredRegions,
}: {
  provider: CloudProvider;
  monitoredRegions?: string[];
}) {
  return (
    <Form.TagPicker
      id="monitoredRegions"
      title="Monitored Regions"
      info="Only show status for these regions. Leave empty to monitor all regions."
      defaultValue={sanitizeMonitoredRegions(provider, monitoredRegions)}
    >
      {getRegionCatalog(provider).map((region) => (
        <Form.TagPicker.Item key={region} value={region} title={region} />
      ))}
    </Form.TagPicker>
  );
}
