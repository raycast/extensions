import { OptionalTracker } from "../types";

interface MarkdownData {
  trackingNumber: string;
  name?: string;
  tracking: OptionalTracker;
  error?: string;
  addedAt?: string;
}

export function generateTrackingMarkdown(data: MarkdownData): string {
  const sections = [];

  // Error handling
  if (data.error) {
    sections.push(`# ${data.name || data.trackingNumber}`);
    sections.push(`## ❌ Error\n${data.error}`);
    return sections.join("\n\n");
  }

  if (!data.tracking) {
    sections.push(`# ${data.name || data.trackingNumber}`);
    sections.push(`## ℹ️ Status\nNo tracking information available`);
    return sections.join("\n\n");
  }

  const shipment = data.tracking.shipment;
  const events = data.tracking.events;

  // Header with status
  const currentStatus = shipment?.statusMilestone || shipment?.statusCategory || "Unknown";
  if (data.name) {
    sections.push(`# ${data.name}`);
    sections.push(`**Tracking Number:** ${data.trackingNumber} (${currentStatus})`);
  } else {
    sections.push(`# Tracking Number: ${data.trackingNumber} (${currentStatus})`);
  }

  // Events Timeline as Table
  if (events && events.length > 0) {
    sections.push(`## 📅 Tracking Events & Movement History`);

    const sortedEvents = events.sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());

    // Create table header
    const tableHeader = `| Date & Time | Status | Location | Milestone | Details |
|-------------|---------|----------|-----------|---------|`;

    const tableRows = sortedEvents.map((event) => {
      const date = new Date(event.datetime);
      const day = date.getDate().toString().padStart(2, "0");
      const month = date.toLocaleDateString("en", { month: "short" });
      const year = date.getFullYear();
      const time = date.toLocaleTimeString();
      const dateTime = `${day} ${month} ${year} ${time}`;

      // Clean status - remove location part
      let status = event.status || "-";
      if (event.location && status.includes(event.location)) {
        // Remove location and separators like "----" from status
        status = status
          .replace(/----.*$/, "")
          .replace(event.location, "")
          .trim();
        status = status.replace(/----$/, "").trim();
      }

      const location = event.location || "-";
      const milestone = event.statusMilestone || event.statusCategory || "-";

      // Build details column
      const details = [];
      if (event.courierCode) details.push(`Courier: ${event.courierCode}`);
      if (event.statusCode) details.push(`Code: ${event.statusCode}`);

      const detailsText = details.length > 0 ? details.join("\n") : "-";

      return `| ${dateTime} | ${status} | ${location} | ${milestone} | ${detailsText} |`;
    });

    sections.push([tableHeader, ...tableRows].join("\n"));
  } else {
    sections.push(`## 📅 Tracking Events & Movement History\nNo tracking events available`);
  }

  // Basic Info
  const basicInfo = [];
  if (data.tracking.tracker?.courierCode && data.tracking.tracker.courierCode.length > 0) {
    basicInfo.push(`**Courier Code:** ${data.tracking.tracker.courierCode.join(", ")}`);
  }
  if (shipment?.shipmentId) basicInfo.push(`**Shipment ID:** ${shipment.shipmentId}`);
  if (shipment?.originCountryCode) basicInfo.push(`**Origin:** ${shipment.originCountryCode}`);
  if (shipment?.destinationCountryCode) basicInfo.push(`**Destination:** ${shipment.destinationCountryCode}`);
  if (shipment?.statusCode) basicInfo.push(`**Status Code:** ${shipment.statusCode}`);
  if (data.tracking.tracker?.isSubscribed !== undefined)
    basicInfo.push(`**Subscribed:** ${data.tracking.tracker.isSubscribed ? "Yes" : "No"}`);
  if (data.tracking.tracker?.isTracked !== undefined)
    basicInfo.push(`**Tracked:** ${data.tracking.tracker.isTracked ? "Yes" : "No"}`);

  // Additional tracking numbers
  if (shipment?.trackingNumbers && shipment.trackingNumbers.length > 1) {
    const additionalNumbers = shipment.trackingNumbers.filter((tn) => tn.tn !== data.trackingNumber).map((tn) => tn.tn);
    if (additionalNumbers.length > 0) {
      basicInfo.push(`**Additional Tracking Numbers:** ${additionalNumbers.join(", ")}`);
    }
  }

  if (basicInfo.length > 0) {
    sections.push(`## ℹ️ Basic Information\n${basicInfo.join("\n\n")}`);
  }

  // Statistics and timestamps
  if (data.tracking.statistics) {
    const stats = data.tracking.statistics;
    const statsInfo = [];

    if (stats.statusCategory) statsInfo.push(`**Status Category:** ${stats.statusCategory}`);
    if (stats.statusMilestone) statsInfo.push(`**Status Milestone:** ${stats.statusMilestone}`);

    // All timestamps
    const timestamps = stats.timestamps;
    if (timestamps.infoReceivedDatetime) {
      const date = new Date(timestamps.infoReceivedDatetime);
      statsInfo.push(`**Info Received:** ${date.toLocaleString()}`);
    }
    if (timestamps.inTransitDatetime) {
      const date = new Date(timestamps.inTransitDatetime);
      statsInfo.push(`**In Transit:** ${date.toLocaleString()}`);
    }
    if (timestamps.outForDeliveryDatetime) {
      const date = new Date(timestamps.outForDeliveryDatetime);
      statsInfo.push(`**Out for Delivery:** ${date.toLocaleString()}`);
    }
    if (timestamps.deliveredDatetime) {
      const date = new Date(timestamps.deliveredDatetime);
      statsInfo.push(`**Delivered:** ${date.toLocaleString()}`);
    }
    if (timestamps.availableForPickupDatetime) {
      const date = new Date(timestamps.availableForPickupDatetime);
      statsInfo.push(`**Available for Pickup:** ${date.toLocaleString()}`);
    }
    if (timestamps.failedAttemptDatetime) {
      const date = new Date(timestamps.failedAttemptDatetime);
      statsInfo.push(`**Failed Attempt:** ${date.toLocaleString()}`);
    }
    if (timestamps.exceptionDatetime) {
      const date = new Date(timestamps.exceptionDatetime);
      statsInfo.push(`**Exception:** ${date.toLocaleString()}`);
    }

    if (statsInfo.length > 0) {
      sections.push(`## 📊 Statistics & Timeline\n${statsInfo.join("\n\n")}`);
    }
  }

  // Technical Info
  const technicalInfo = [];
  if (data.tracking.tracker?.trackerId) technicalInfo.push(`**Tracker ID:** ${data.tracking.tracker.trackerId}`);
  if (data.tracking.tracker?.createdAt) {
    const date = new Date(data.tracking.tracker.createdAt);
    technicalInfo.push(`**Tracker Created:** ${date.toLocaleString()}`);
  }
  if (data.addedAt) {
    const date = new Date(data.addedAt);
    technicalInfo.push(`**Added to App:** ${date.toLocaleString()}`);
  }

  if (technicalInfo.length > 0) {
    sections.push(`## 🔧 Technical Information\n${technicalInfo.join("\n\n")}`);
  }

  return sections.join("\n\n");
}
