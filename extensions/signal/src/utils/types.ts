export interface Chat {
  id: string;
  name: string;
  pinned: boolean;
  lastOpened?: number;
}

export interface SignalChat extends Chat {
  phone: string;
}

export function isSignalChat(chat: SignalChat) {
  return chat.phone !== undefined;
}
