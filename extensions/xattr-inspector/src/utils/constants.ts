export const MAX_KEY_BYTES = 255;
export const MAX_VALUE_BYTES = 120_000;
export const MAX_FLAG_BYTES = 64;
export const KEY_PATTERN = /^[\w.\-:#]+$/;
export const FLAG_PATTERN = /^[\w.\-:]+$/;

interface SecurityWarning {
  removeMessage: string;
  editMessage: string;
}

const SECURITY_WARNINGS: Record<string, SecurityWarning> = {
  "com.apple.quarantine": {
    removeMessage:
      "Removing quarantine disables the Gatekeeper warning for this file. macOS will no longer flag it as downloaded from the internet, which could allow unverified code to run without prompting.",
    editMessage:
      "Changing the quarantine value can alter how Gatekeeper treats this file. For example, modifying the flag may mark it as already opened, bypassing future security prompts.",
  },
  "com.apple.provenance": {
    removeMessage:
      "Removing provenance deletes origin-tracking data used by Gatekeeper. macOS may no longer associate this file with its original source.",
    editMessage:
      "Modifying provenance data can affect how macOS tracks this file's origin and may alter Gatekeeper behavior.",
  },
  "com.apple.macl": {
    removeMessage:
      "Removing the access control list (MACL) will revoke TCC permissions that apps have been granted to access this file. Those apps will need to request access again.",
    editMessage:
      "Modifying TCC access control data can corrupt permission grants. Apps may lose access to this file or behave unexpectedly.",
  },
  "com.apple.rootless": {
    removeMessage:
      "This attribute marks content protected by System Integrity Protection (SIP). Removal is normally blocked by macOS unless SIP is disabled.",
    editMessage:
      "This attribute is managed by System Integrity Protection (SIP). Modifications are normally blocked by macOS unless SIP is disabled.",
  },
};

export function getSecurityWarning(attrName: string): SecurityWarning | undefined {
  return SECURITY_WARNINGS[attrName];
}
