export type AppleContact = {
  name: string;
  phone: string;
};

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

export function isAppleContact(contact: { name?: string, phone?: string }): contact is AppleContact {
  return contact.name !== undefined && contact.phone !== undefined;
}

export function isGroupChat(chat: WhatsAppChat): chat is GroupChat {
  return (chat as GroupChat).groupCode !== undefined;
}

export function isPhoneChat(chat: WhatsAppChat): chat is PhoneChat {
  return (chat as PhoneChat).phone !== undefined;
}
