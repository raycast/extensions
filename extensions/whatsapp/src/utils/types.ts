export interface Chat {
  id: string;
  name: string;
  pinned: boolean;
  lastOpened?: number;
}

export interface PhoneChat extends Chat {
  phone: string;
}

export interface GroupChat extends Chat {
  groupCode: string;
}

export type WhatsAppChat = PhoneChat | GroupChat;

export function isGroupChat(chat: WhatsAppChat): chat is GroupChat {
  return (chat as GroupChat).groupCode !== undefined;
}

export function isPhoneChat(chat: WhatsAppChat): chat is PhoneChat {
  return (chat as PhoneChat).phone !== undefined;
}
