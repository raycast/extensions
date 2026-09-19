import { describe, it, expect } from "vitest";
import { parseOpenedChannelId } from "./dm-response";

describe("parseOpenedChannelId", () => {
  it("reads the channel id out of a well-formed response", () => {
    const message = 'response:{"channel_id":"23e68814-4859-4f93-966e-ba0a6366f3c5","created":true}';
    expect(parseOpenedChannelId(message)).toBe("23e68814-4859-4f93-966e-ba0a6366f3c5");
  });

  it("reads the id just the same when the conversation already existed", () => {
    // created:false is the idempotent case: the relay returns the id of the
    // conversation that was already open rather than making a second one.
    const message = 'response:{"channel_id":"existing-id","created":false}';
    expect(parseOpenedChannelId(message)).toBe("existing-id");
  });

  it("returns null when the response: prefix is absent", () => {
    expect(parseOpenedChannelId('{"channel_id":"abc"}')).toBeNull();
  });

  it("returns null when the payload is not valid JSON", () => {
    expect(parseOpenedChannelId("response:{not json")).toBeNull();
  });

  it("returns null when channel_id is missing", () => {
    expect(parseOpenedChannelId('response:{"created":true}')).toBeNull();
  });

  it("returns null when channel_id is not a string", () => {
    expect(parseOpenedChannelId('response:{"channel_id":42}')).toBeNull();
  });

  it("returns null when channel_id is an empty string", () => {
    // An empty id would be accepted as a channel and then send messages nowhere.
    expect(parseOpenedChannelId('response:{"channel_id":""}')).toBeNull();
  });

  it("returns null when the payload is valid JSON but not an object", () => {
    expect(parseOpenedChannelId("response:null")).toBeNull();
    expect(parseOpenedChannelId("response:[1,2]")).toBeNull();
  });

  it("returns null for an empty message", () => {
    expect(parseOpenedChannelId("")).toBeNull();
  });
});
