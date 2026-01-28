import { Icon } from "@raycast/api";

export const CacheKey = {
  AUTHENTICATION_TOKEN: "Authentication token",
  SOUND: "Sound",
  ICON: "Icon",
};

//Auth Token expire time: 30 minutes
export const EXPIRE_TIME = 30 * 60 * 1000;

export const sounds = [
  { name: "Alarm", value: "alarm.caf", icon: Icon.SpeakerOn },
  { name: "Anticipate", value: "anticipate.caf", icon: Icon.SpeakerOn },
  { name: "Bell", value: "bell.caf", icon: Icon.SpeakerOn },
  { name: "Birdsong", value: "birdsong.caf", icon: Icon.SpeakerOn },
  { name: "Calypso", value: "calypso.caf", icon: Icon.SpeakerOn },
  { name: "Chime", value: "chime.caf", icon: Icon.SpeakerOn },
  { name: "Choo", value: "choo.caf", icon: Icon.SpeakerOn },
  { name: "Descent", value: "descent.caf", icon: Icon.SpeakerOn },
  { name: "Electronic", value: "electronic.caf", icon: Icon.SpeakerOn },
  { name: "Fanfare", value: "fanfare.caf", icon: Icon.SpeakerOn },
  { name: "Glass", value: "glass.caf", icon: Icon.SpeakerOn },
  { name: "Gotosleep", value: "gotosleep.caf", icon: Icon.SpeakerOn },
  { name: "Healthnotification", value: "healthnotification.caf", icon: Icon.SpeakerOn },
  { name: "Horn", value: "horn.caf", icon: Icon.SpeakerOn },
  { name: "Ladder", value: "ladder.caf", icon: Icon.SpeakerOn },
  { name: "Mailsent", value: "mailsent.caf", icon: Icon.SpeakerOn },
  { name: "Multiwayinvitation", value: "multiwayinvitation.caf", icon: Icon.SpeakerOn },
  { name: "Newmail", value: "newmail.caf", icon: Icon.SpeakerOn },
  { name: "Newsflash", value: "newsflash.caf", icon: Icon.SpeakerOn },
  { name: "Noir", value: "noir.caf", icon: Icon.SpeakerOn },
  { name: "Paymentsuccess", value: "paymentsuccess.caf", icon: Icon.SpeakerOn },
  { name: "Sherwoodforest", value: "sherwoodforest.caf", icon: Icon.SpeakerOn },
  { name: "Silence (Default)", value: "silence.caf", icon: Icon.SpeakerOff },
  { name: "Spell", value: "spell.caf", icon: Icon.SpeakerOn },
  { name: "Suspense", value: "suspense.caf", icon: Icon.SpeakerOn },
  { name: "Telegraph", value: "telegraph.caf", icon: Icon.SpeakerOn },
  { name: "Tiptoes", value: "tiptoes.caf", icon: Icon.SpeakerOn },
  { name: "Typewriters", value: "typewriters.caf", icon: Icon.SpeakerOn },
  { name: "Update", value: "update.caf", icon: Icon.SpeakerOn },
];
