import { List, getPreferenceValues } from "@raycast/api";
import { AmpUsage, AmpError } from "./types";
import type { Accessory } from "../agents/types";
import {
  renderErrorOrNoData,
  formatErrorOrNoData,
  getLoadingAccessory,
  getNoDataAccessory,
  generatePieIcon,
} from "../agents/ui";

type Preferences = Preferences.AgentUsage;

export function formatAmpUsageText(usage: AmpUsage | null, error: AmpError | null): string {
  const fallback = formatErrorOrNoData("Amp", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as AmpUsage;

  const { email, nickname, ampFree, individualCredits } = u;
  const ampFreeRemaining = ampFree.total - ampFree.used;
  const ampFreePercent = ampFree.total > 0 ? (ampFreeRemaining / ampFree.total) * 100 : 0;

  let text = `Amp Usage\nEmail: ${email}`;
  if (nickname) text += `\nNickname: ${nickname}`;
  text += `\n\nAmp Free: ${ampFree.unit}${ampFreeRemaining.toFixed(2)} / ${ampFree.unit}${ampFree.total.toFixed(2)} (${ampFreePercent.toFixed(1)}%)`;
  if (ampFree.replenishRate) {
    text += `\nReplenish Rate: +${ampFree.replenishRate}`;
    const replenishValue = parseFloat(ampFree.replenishRate.replace(/[^0-9.]/g, ""));
    if (replenishValue > 0) {
      const remainingToFull = ampFree.total - ampFreeRemaining;
      if (remainingToFull > 0) {
        const hoursToFull = remainingToFull / replenishValue;
        const totalMinutes = Math.ceil(hoursToFull * 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        let timeText = "";
        if (hours > 0) timeText += `${hours}h `;
        if (minutes > 0 || hours === 0) timeText += `${minutes}m`;
        text += `\nReset In: ${timeText.trim()}`;
      }
    }
  }
  if (ampFree.bonus) text += `\nBonus: ${ampFree.bonus}`;
  text += `\n\nIndividual Credits: ${individualCredits.unit}${individualCredits.remaining.toFixed(2)}`;

  return text;
}

export function renderAmpDetail(usage: AmpUsage | null, error: AmpError | null): React.ReactNode {
  const fallback = renderErrorOrNoData(usage, error);
  if (fallback !== null) return fallback;
  const u = usage as AmpUsage;

  const { email, nickname, ampFree, individualCredits } = u;
  const ampFreeRemaining = ampFree.total - ampFree.used;
  const ampFreePercent = ampFree.total > 0 ? (ampFreeRemaining / ampFree.total) * 100 : 0;

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Email" text={email} />
      {nickname && <List.Item.Detail.Metadata.Label title="Nickname" text={nickname} />}

      <List.Item.Detail.Metadata.Separator />

      <List.Item.Detail.Metadata.Label title="Amp Free Used" text={`${ampFree.unit}${ampFree.used.toFixed(2)}`} />
      <List.Item.Detail.Metadata.Label title="Amp Free Total" text={`${ampFree.unit}${ampFree.total.toFixed(2)}`} />
      <List.Item.Detail.Metadata.Label
        title="Amp Free Remaining"
        text={`${ampFree.unit}${ampFreeRemaining.toFixed(2)} (${ampFreePercent.toFixed(1)}%)`}
      />
      {ampFree.replenishRate && (
        <List.Item.Detail.Metadata.Label title="Replenish Rate" text={`+${ampFree.replenishRate}`} />
      )}
      {(() => {
        const replenishValue = ampFree.replenishRate ? parseFloat(ampFree.replenishRate.replace(/[^0-9.]/g, "")) : 0;
        if (replenishValue <= 0) return null;
        const remainingToFull = ampFree.total - ampFreeRemaining;
        if (remainingToFull <= 0) return null;
        const hoursToFull = remainingToFull / replenishValue;
        const totalMinutes = Math.ceil(hoursToFull * 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        let timeText = "";
        if (hours > 0) timeText += `${hours}h `;
        if (minutes > 0 || hours === 0) timeText += `${minutes}m`;
        return <List.Item.Detail.Metadata.Label title="Reset In" text={timeText.trim()} />;
      })()}
      {ampFree.bonus && <List.Item.Detail.Metadata.Label title="Bonus" text={ampFree.bonus} />}

      <List.Item.Detail.Metadata.Separator />

      <List.Item.Detail.Metadata.Label
        title="Individual Credits"
        text={`${individualCredits.unit}${individualCredits.remaining.toFixed(2)}`}
      />
    </List.Item.Detail.Metadata>
  );
}

export function getAmpAccessory(usage: AmpUsage | null, error: AmpError | null, isLoading: boolean): Accessory {
  if (isLoading) {
    return getLoadingAccessory("Amp");
  }

  if (error) {
    if (error.type === "not_found") {
      return { text: "Not Installed", tooltip: error.message };
    }
    if (error.type === "not_logged_in") {
      return { text: "Not Logged In", tooltip: error.message };
    }
    return { text: "Error", tooltip: error.message };
  }

  if (!usage) {
    return getNoDataAccessory();
  }

  const { ampDisplayMode = "amount" } = getPreferenceValues<Preferences>();
  const remaining = usage.ampFree.total - usage.ampFree.used;
  const percent = usage.ampFree.total > 0 ? (remaining / usage.ampFree.total) * 100 : 0;

  const icon = generatePieIcon(percent);

  if (ampDisplayMode === "percentage") {
    return {
      icon,
      text: `${percent.toFixed(1)}%`,
      tooltip: `${usage.ampFree.unit}${remaining.toFixed(2)} remaining (${percent.toFixed(1)}%)`,
    };
  }

  return {
    icon,
    text: `${usage.ampFree.unit}${remaining.toFixed(2)}`,
    tooltip: `${usage.ampFree.unit}${remaining.toFixed(2)} remaining (${percent.toFixed(1)}%)`,
  };
}
