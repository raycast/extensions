import {
  LEGACY_SPACE_API_RPC_REQUEST_NOTIFICATION,
  LEGACY_SPACE_API_RPC_RESPONSE_NOTIFICATION,
  SPACE_API_PAYLOAD_KEY,
  SPACE_API_RPC_REQUEST_NOTIFICATION,
  SPACE_API_RPC_RESPONSE_NOTIFICATION,
  type SpaceAPINamespace,
} from "./contract";

export function makeStructuredSpaceAPIJXA(
  requestID: string,
  requestPayload: string,
  timeoutMs: number,
  namespace: SpaceAPINamespace = "preferred",
): string {
  const requestNotification =
    namespace === "legacy" ? LEGACY_SPACE_API_RPC_REQUEST_NOTIFICATION : SPACE_API_RPC_REQUEST_NOTIFICATION;
  const responseNotification =
    namespace === "legacy" ? LEGACY_SPACE_API_RPC_RESPONSE_NOTIFICATION : SPACE_API_RPC_RESPONSE_NOTIFICATION;

  return `
ObjC.import('Foundation');
const requestID = ${JSON.stringify(requestID)};
const requestPayload = ${JSON.stringify(requestPayload)};
const center = $.NSDistributedNotificationCenter.defaultCenter;
const responseName = ${JSON.stringify(responseNotification)};
let responsePayload = null;
let finished = false;
const observer = center.addObserverForNameObjectQueueUsingBlock(
  responseName,
  undefined,
  undefined,
  function(notification) {
    const info = ObjC.unwrap(notification.userInfo);
    const payload = info ? ObjC.unwrap(info.payload) : undefined;
    if (payload) {
      try {
        const candidate = JSON.parse(String(payload));
        if (candidate && candidate.id === requestID) {
          responsePayload = String(payload);
          finished = true;
        }
      } catch (_) {
        // Leave malformed or unrelated broadcasts for the correlated request to reject.
      }
    }
  }
);
const userInfo = $.NSMutableDictionary.dictionary;
userInfo.setObjectForKey(requestPayload, '${SPACE_API_PAYLOAD_KEY}');
center.postNotificationNameObjectUserInfoDeliverImmediately(${JSON.stringify(requestNotification)}, undefined, userInfo, true);
const deadline = Date.now() + ${timeoutMs};
while (!finished && Date.now() < deadline) {
  $.NSRunLoop.currentRunLoop.runUntilDate($.NSDate.dateWithTimeIntervalSinceNow(0.01));
}
center.removeObserver(observer);
if (!responsePayload) throw new Error('Structured SpaceAPI request timed out.');
console.log(responsePayload);
`;
}
