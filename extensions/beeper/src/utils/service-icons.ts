import { Color, Icon } from "@raycast/api";
import { BeeperService } from "./types";

interface ServiceIconConfig {
  icon: Icon | string;
  color: Color;
  tintColor?: Color;
}

export const serviceIcons: Record<BeeperService, ServiceIconConfig> = {
  whatsapp: { icon: Icon.Message, color: Color.Green, tintColor: Color.Green },
  telegram: { icon: Icon.Airplane, color: Color.Blue, tintColor: Color.Blue },
  signal: { icon: Icon.Lock, color: Color.Blue, tintColor: Color.Blue },
  instagram: { icon: Icon.Image, color: Color.Magenta, tintColor: Color.Magenta },
  messenger: { icon: Icon.Bubble, color: Color.Blue, tintColor: Color.Blue },
  discord: { icon: Icon.SpeechBubble, color: Color.Purple, tintColor: Color.Purple },
  slack: { icon: Icon.Hashtag, color: Color.Orange, tintColor: Color.Orange },
  linkedin: { icon: Icon.Link, color: Color.Blue, tintColor: Color.Blue },
  twitter: { icon: Icon.Bird, color: Color.Blue, tintColor: Color.Blue },
  googlechat: { icon: Icon.Message, color: Color.Green, tintColor: Color.Green },
  googlemessages: { icon: Icon.Phone, color: Color.Blue, tintColor: Color.Blue },
  googlevoice: { icon: Icon.Phone, color: Color.Green, tintColor: Color.Green },
  sms: { icon: Icon.Message, color: Color.Green, tintColor: Color.Green },
  imessage: { icon: Icon.Message, color: Color.Blue, tintColor: Color.Blue },
  matrix: { icon: Icon.Network, color: Color.Green, tintColor: Color.Green },
  unknown: { icon: Icon.QuestionMark, color: Color.SecondaryText },
};

export function getServiceIcon(service: BeeperService): ServiceIconConfig {
  return serviceIcons[service] || serviceIcons.unknown;
}

const serviceDisplayNames: Record<BeeperService, string> = {
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  signal: "Signal",
  instagram: "Instagram",
  messenger: "Messenger",
  discord: "Discord",
  slack: "Slack",
  linkedin: "LinkedIn",
  twitter: "X (Twitter)",
  googlechat: "Google Chat",
  googlemessages: "Google Messages",
  googlevoice: "Google Voice",
  sms: "SMS",
  imessage: "iMessage",
  matrix: "Beeper (Matrix)",
  unknown: "Unknown",
};

export function getServiceDisplayName(service: BeeperService): string {
  return serviceDisplayNames[service] || service;
}

export function getAllServices(): BeeperService[] {
  return Object.keys(serviceDisplayNames).filter((s) => s !== "unknown") as BeeperService[];
}
