/**
 * Statistics and lifecycle rows for the pushed Details view.
 *
 * `Detail.Metadata.Label` and `List.Item.Detail.Metadata.Label` are different
 * components, so the JSX cannot be shared with listItemDetail — but everything
 * that decides WHAT to show is (analyticsRows, packageStatus), so the two views
 * cannot drift in content.
 *
 * Both take the ALREADY-FETCHED detail rather than calling usePackageDetail
 * themselves: two hook instances in one view would request the same document
 * twice, which is the duplication the shared hook exists to prevent.
 */

import { Color, Detail, Icon } from "@raycast/api";
import { analyticsRows, packageStatus } from "../utils";
import { PackageDetailState } from "../hooks/usePackageDetail";

/**
 * Deprecation or disablement, above everything else because it changes whether
 * a package is worth installing at all. Rendered only when there is something
 * to say.
 */
export function PackageStatusMetadata(props: { state: PackageDetailState }) {
  const status = packageStatus(props.state.data);

  if (!status) {
    return null;
  }

  return (
    <>
      <Detail.Metadata.Label
        title={status.title}
        text={{ value: status.text, color: Color.Orange }}
        icon={{ source: Icon.Warning, tintColor: Color.Orange }}
      />
      <Detail.Metadata.Separator />
    </>
  );
}

/** Install counts, matching the analytics table on the package's brew.sh page. */
export function PackageAnalyticsMetadata(props: { state: PackageDetailState }) {
  return (
    <>
      <Detail.Metadata.Separator />
      {analyticsRows(props.state.data, props.state.failed).map((row) => (
        <Detail.Metadata.Label key={row.key} title={row.title} text={row.text} />
      ))}
    </>
  );
}
