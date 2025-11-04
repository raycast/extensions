import { getPreferences } from "./preferences";

export type ApiError = {
  status?: number;
  message: string;
};

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { baseUrl, apiKey } = getPreferences();
  const url = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    apikey: apiKey,
    ...(options.headers as Record<string, string>),
  };

  // Only add Content-Type if there's a body
  if (options.body) {
    if (options.body instanceof FormData) {
      // Don't set Content-Type for FormData, browser will set it with boundary
    } else {
      headers["Content-Type"] = "application/json";
    }
  }

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = (await res.json()) as { message?: string };
      if (data?.message) msg = data.message;
    } catch {
      // ignore
    }
    const err: ApiError = { status: res.status, message: msg };
    throw err;
  }
  // Try to parse JSON; fall back to text
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

export type CreateInstancePayload = {
  instanceName: string;
  qrcode?: boolean;
  integration?: "WHATSAPP-BAILEYS" | "WHATSAPP-BUSINESS" | "EVOLUTION";
};

export async function createInstance(payload: CreateInstancePayload) {
  return apiRequest("/instance/create", {
    method: "POST",
    body: JSON.stringify({
      instanceName: payload.instanceName,
      qrcode: payload.qrcode ?? true,
      integration: payload.integration ?? "WHATSAPP-BAILEYS",
    }),
  });
}

export async function fetchInstances(params?: { instanceName?: string; instanceId?: string }) {
  const query = new URLSearchParams();
  if (params?.instanceName) query.set("instanceName", params.instanceName);
  if (params?.instanceId) query.set("instanceId", params.instanceId);
  const qs = query.toString();
  return apiRequest(`/instance/fetchInstances${qs ? `?${qs}` : ""}`, {
    method: "GET",
  });
}

export async function sendTextMessage(options: {
  instanceName: string;
  number: string;
  text: string;
  linkPreview?: boolean;
}) {
  const body: Record<string, unknown> = {
    number: options.number,
    text: options.text,
  };

  // Add optional fields if provided
  if (options.linkPreview !== undefined) {
    body.linkPreview = options.linkPreview;
  }

  return apiRequest(`/message/sendText/${options.instanceName}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function instanceConnect(instanceName: string, number?: string) {
  const query = new URLSearchParams();
  if (number) query.set("number", number);
  return apiRequest(`/instance/connect/${instanceName}${query.toString() ? `?${query.toString()}` : ""}`);
}

export async function instanceRestart(instanceName: string) {
  return apiRequest(`/instance/restart/${instanceName}`, { method: "POST" });
}

export async function instanceLogout(instanceName: string) {
  return apiRequest(`/instance/logout/${instanceName}`, { method: "DELETE" });
}

export async function instanceDelete(instanceName: string) {
  return apiRequest(`/instance/delete/${instanceName}`, { method: "DELETE" });
}

export async function setPresence(instanceName: string, presence: "available" | "unavailable") {
  return apiRequest(`/instance/setPresence/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({ presence }),
  });
}

export async function connectionState(instanceName: string) {
  return apiRequest(`/instance/connectionState/${instanceName}`);
}

export async function sendMedia(instanceName: string, formData: FormData) {
  return apiRequest(`/message/sendMedia/${instanceName}`, {
    method: "POST",
    body: formData,
  });
}

export async function sendPtv(instanceName: string, formData: FormData) {
  return apiRequest(`/message/sendPtv/${instanceName}`, {
    method: "POST",
    body: formData,
  });
}

export async function sendWhatsAppAudio(options: { instanceName: string; number: string; audio: string }) {
  return apiRequest(`/message/sendWhatsAppAudio/${options.instanceName}`, {
    method: "POST",
    body: JSON.stringify({ number: options.number, audio: options.audio }),
  });
}

export async function sendStatus(
  instanceName: string,
  payload: {
    type: "text" | "image" | "video" | "audio";
    content: string;
    caption?: string;
    backgroundColor?: string;
    font?: number;
    allContacts: boolean;
    statusJidList?: string[];
  },
) {
  return apiRequest(`/message/sendStatus/${instanceName}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function sendSticker(options: { instanceName: string; number: string; sticker: string }) {
  return apiRequest(`/message/sendSticker/${options.instanceName}`, {
    method: "POST",
    body: JSON.stringify({ number: options.number, sticker: options.sticker }),
  });
}

export async function sendLocation(options: {
  instanceName: string;
  number: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}) {
  return apiRequest(`/message/sendLocation/${options.instanceName}`, {
    method: "POST",
    body: JSON.stringify({
      number: options.number,
      name: options.name,
      address: options.address,
      latitude: options.latitude,
      longitude: options.longitude,
    }),
  });
}

export async function sendContact(options: {
  instanceName: string;
  number: string;
  contact: Array<{
    fullName: string;
    wuid: string;
    phoneNumber: string;
    organization?: string;
    email?: string;
    url?: string;
  }>;
}) {
  return apiRequest(`/message/sendContact/${options.instanceName}`, {
    method: "POST",
    body: JSON.stringify({ number: options.number, contact: options.contact }),
  });
}

export async function sendReaction(options: {
  instanceName: string;
  key: { remoteJid: string; fromMe: boolean; id: string };
  reaction: string;
}) {
  return apiRequest(`/message/sendReaction/${options.instanceName}`, {
    method: "POST",
    body: JSON.stringify({ key: options.key, reaction: options.reaction }),
  });
}

export async function sendPoll(options: {
  instanceName: string;
  number: string;
  name: string;
  selectableCount: number;
  values: string[];
}) {
  return apiRequest(`/message/sendPoll/${options.instanceName}`, {
    method: "POST",
    body: JSON.stringify({
      number: options.number,
      name: options.name,
      selectableCount: options.selectableCount,
      values: options.values,
    }),
  });
}

export async function sendList(options: {
  instanceName: string;
  number: string;
  title: string;
  description: string;
  buttonText: string;
  footerText: string;
  sections: Array<{
    title: string;
    rows: Array<{ title: string; description: string; rowId: string }>;
  }>;
}) {
  return apiRequest(`/message/sendList/${options.instanceName}`, {
    method: "POST",
    body: JSON.stringify({
      number: options.number,
      title: options.title,
      description: options.description,
      buttonText: options.buttonText,
      footerText: options.footerText,
      sections: options.sections,
    }),
  });
}

export async function checkWhatsAppNumbers(instanceName: string, numbers: string[]) {
  return apiRequest(`/chat/whatsappNumbers/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({ numbers }),
  });
}
