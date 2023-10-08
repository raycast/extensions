import { Detail } from "@raycast/api";
import { Address, ShippingInfo, TimeMetrics } from "../types";

export function makeMetaData(shippingInfo: ShippingInfo, timeMetrics: TimeMetrics) {
  const fromAddress = makeAddress(shippingInfo.shipper_address);
  const toAddress = makeAddress(shippingInfo.recipient_address);

  const fromETA = new Date(timeMetrics.estimated_delivery_date.from as string).toLocaleDateString();
  const toETA = new Date(timeMetrics.estimated_delivery_date.to as string).toLocaleDateString();

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Days Since Ordered" text={`${timeMetrics.days_after_order}`} />
      <Detail.Metadata.Label title="Days of Transit" text={`${timeMetrics.days_of_transit}`} />
      <Detail.Metadata.Label title="Days Since Last Update" text={`${timeMetrics.days_after_last_update}`} />
      <Detail.Metadata.Separator />
      {fromAddress !== null ? <Detail.Metadata.Label title="From" text={fromAddress} /> : null}
      {toAddress !== null ? <Detail.Metadata.Label title="To" text={toAddress} /> : null}
      {timeMetrics.estimated_delivery_date.from !== null ? (
        <Detail.Metadata.TagList title="Estimated Delivery Date">
          <Detail.Metadata.TagList.Item text={`From: ${fromETA}`} color={"#390050"} />
          <Detail.Metadata.TagList.Item text={`From: ${toETA}`} color={"#0E3F9C"} />
        </Detail.Metadata.TagList>
      ) : null}
    </Detail.Metadata>
  );
}

function makeAddress(shippingInfo: Address): string | null {
  const address: string[] = [];

  if (shippingInfo.city !== null && shippingInfo.city !== undefined) {
    address.push(shippingInfo.city);
  }
  if (shippingInfo.state !== null && shippingInfo.state !== undefined) {
    address.push(shippingInfo.state);
  }
  if (shippingInfo.country !== null && shippingInfo.country !== undefined) {
    address.push(shippingInfo.country);
  }
  if (address.length > 0) {
    return address.join(", ");
  } else {
    return null;
  }
}
