import { describe, it, expect } from "vitest";
import { Api } from "teleproto/tl";
import bigInt from "big-integer";
import { renderMessageContent, hasRenderableContent, parseMessageMedia, resolveMessageAuthor } from "./telegram-client";

/** A rich message with one bold paragraph, as a bot would send. */
function richMessage(): Api.RichMessage {
  return new Api.RichMessage({
    blocks: [
      new Api.PageBlockParagraph({ text: new Api.TextBold({ text: new Api.TextPlain({ text: "Build finished" }) }) }),
      new Api.PageBlockParagraph({ text: new Api.TextPlain({ text: "All checks passed" }) }),
    ],
    photos: [],
    documents: [],
  });
}

const asMessage = (fields: Partial<Api.Message>) => fields as Api.Message;

describe("renderMessageContent", () => {
  it("uses the plain message when there is one", () => {
    expect(renderMessageContent(asMessage({ message: "hello" }))).toEqual({ text: "hello" });
  });

  it("reads a rich message, which lives outside message.message", () => {
    const { text, markdown } = renderMessageContent(asMessage({ message: "", richMessage: richMessage() }));

    // List titles are single-line, so block structure is collapsed.
    expect(text).toBe("Build finished All checks passed");
    // The detail pane keeps the bot's formatting.
    expect(markdown).toBe("**Build finished**\n\nAll checks passed");
  });

  it("returns empty text when the message carries nothing", () => {
    expect(renderMessageContent(asMessage({ message: "" }))).toEqual({ text: "" });
  });
});

describe("hasRenderableContent", () => {
  // Regression: filtering on message||media alone dropped every rich message,
  // so bot chats rendered as if they were empty.
  it("keeps a rich message that has no text and no media", () => {
    expect(hasRenderableContent(asMessage({ message: "", richMessage: richMessage() }))).toBe(true);
  });

  it("keeps ordinary text and media messages", () => {
    expect(hasRenderableContent(asMessage({ message: "hi" }))).toBe(true);
    expect(hasRenderableContent(asMessage({ message: "", media: new Api.MessageMediaEmpty() }))).toBe(true);
  });

  it("drops a message with no content at all", () => {
    expect(hasRenderableContent(asMessage({ message: "" }))).toBe(false);
  });
});

describe("parseMessageMedia", () => {
  it("returns undefined when there is no media", () => {
    expect(parseMessageMedia(asMessage({ message: "hi" }))).toBeUndefined();
  });

  it("reports a web page preview as a link", () => {
    const media = new Api.MessageMediaWebPage({ webpage: new Api.WebPageEmpty({ id: BigInt(1) as never }) });
    expect(parseMessageMedia(asMessage({ media }))?.type).toBe("link");
  });

  it("falls back to unknown for media it cannot describe", () => {
    // What the server sends when it will not show content to this client.
    const media = new Api.MessageMediaUnsupported();
    expect(parseMessageMedia(asMessage({ media }))?.type).toBe("unknown");
  });
});

const user = (id: number, firstName: string) => new Api.User({ id: bigInt(id), firstName });

const channel = (id: number, title: string) =>
  new Api.Channel({ id: bigInt(id), title, photo: new Api.ChatPhotoEmpty(), date: 0 });

describe("resolveMessageAuthor", () => {
  it("uses the user the response already carried", () => {
    const ada = user(42, "Ada");
    const { senderId, entity } = resolveMessageAuthor(
      asMessage({ fromId: new Api.PeerUser({ userId: bigInt(42) }), sender: ada }),
    );

    expect(senderId).toBe("42");
    expect(entity).toBe(ada);
  });

  it("returns the id without an entity so the caller can look the user up", () => {
    const { senderId, entity } = resolveMessageAuthor(asMessage({ fromId: new Api.PeerUser({ userId: bigInt(42) }) }));

    expect(senderId).toBe("42");
    expect(entity).toBeUndefined();
  });

  it("attributes anonymous group admins to the channel they post as", () => {
    const ops = channel(77, "Ops");
    const { senderId, entity } = resolveMessageAuthor(
      asMessage({ fromId: new Api.PeerChannel({ channelId: bigInt(77) }), sender: ops }),
    );

    expect(senderId).toBe("77");
    expect(entity).toBe(ops);
  });

  it("attributes a channel post that omits fromId to the channel itself", () => {
    // Broadcast posts carry no fromId at all -- the channel is the author. Requiring
    // fromId left these with no sender name and no id.
    const ops = channel(77, "Ops");
    const { senderId, entity } = resolveMessageAuthor(asMessage({ sender: ops }));

    expect(senderId).toBe("77");
    expect(entity).toBe(ops);
  });

  it("falls back to the chat itself for a channel post with no sender attached", () => {
    const ops = channel(77, "Ops");
    const { senderId, entity } = resolveMessageAuthor(asMessage({}), ops);

    expect(senderId).toBe("77");
    expect(entity).toBe(ops);
  });

  it("attributes a private message to the chat partner", () => {
    const ada = user(42, "Ada");
    const { senderId, entity } = resolveMessageAuthor(asMessage({}), ada);

    expect(senderId).toBe("42");
    expect(entity).toBe(ada);
  });

  it("returns nothing when there is no author to be found", () => {
    expect(resolveMessageAuthor(asMessage({}))).toEqual({});
  });
});
