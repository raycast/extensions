import { Action, ActionPanel, Detail, Keyboard } from "@raycast/api";
import { Delivery } from "../types/delivery";
import { Package } from "../types/package";
import { deliveryIcon, deliveryStatus, getPackageWithEarliestDeliveryDate } from "../package";
import { formatDate } from "../utils/dateUtils";
import carriers from "../carriers";

export default function ShowDetailsView({ delivery, packages }: { delivery: Delivery; packages: Package[] }) {
  const markdown = `# ${delivery.name}
${delivery.notes ? `\n> ${delivery.notes}\n` : ""}
  
${packages.length > 0 ? packages.map((aPackage, index) => markdownForPackage(aPackage, index)).reduce((firstValue, secondValue) => `${firstValue}\n${secondValue}`) : "No packages found."}`;

  return (
    <Detail
      navigationTitle={delivery.name}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Carrier"
            icon={carriers.get(delivery.carrier)?.icon}
            text={{
              value: carriers.get(delivery.carrier)?.name ?? "Unknown",
              color: carriers.get(delivery.carrier)?.color,
            }}
          />
          <Detail.Metadata.Label title="Tracking Number" text={delivery.trackingNumber} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Status" text={deliveryStatus(packages).value} icon={deliveryIcon(packages)} />
          <Detail.Metadata.Label
            title="Delivery Date"
            text={
              getPackageWithEarliestDeliveryDate(packages)?.deliveryDate
                ? formatDate(getPackageWithEarliestDeliveryDate(packages)!.deliveryDate!)
                : "Unknown"
            }
          />
          <Detail.Metadata.Label title="Number of Packages" text={packages.length.toString()} />
          {delivery.notes && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="Notes" text={delivery.notes} />
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            url={carriers.get(delivery.carrier)?.urlToTrackingWebpage(delivery) ?? ""}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
          <Action.CopyToClipboard
            title="Copy Tracking Number"
            shortcut={Keyboard.Shortcut.Common.Copy}
            content={delivery.trackingNumber}
          />
        </ActionPanel>
      }
    />
  );

  function markdownForPackage(aPackage: Package, index: number): string {
    return `## Package ${index + 1}
    
${aPackage.delivered ? "Delivered!" : "Not delivered."}

Delivery Date: ${aPackage.deliveryDate ? formatDate(aPackage.deliveryDate) : "Unknown"}.
`;
  }
}
