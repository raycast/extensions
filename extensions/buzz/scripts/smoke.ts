import { BuzzClient } from "../src/lib/buzz-client";
import { parseSecretKey } from "../src/lib/nostr";
import { errorMessage } from "../src/lib/errors";

const envRelayUrl = process.env.BUZZ_RELAY_URL;
const envPrivateKey = process.env.BUZZ_PRIVATE_KEY;

if (!envRelayUrl || !envPrivateKey) {
  process.stderr.write(
    "Smoke test requires BUZZ_RELAY_URL and BUZZ_PRIVATE_KEY environment variables.\n" +
      "Example: BUZZ_RELAY_URL=https://relay.example.com BUZZ_PRIVATE_KEY=nsec1... npm run smoke\n",
  );
  process.exit(1);
}

const relayUrl: string = envRelayUrl;
const privateKey: string = envPrivateKey;

async function main() {
  try {
    const secretKey = parseSecretKey(privateKey);
    const client = new BuzzClient(relayUrl, secretKey);

    console.log("Listing channels...");
    const channels = await client.listChannels();
    console.log(`Found ${channels.length} channel(s)`);

    if (channels.length === 0) {
      console.log("No channels available; skipping send/read test (auth verified)");
    } else {
      const channelId = channels[0].id;
      console.log(`Sending message to channel: ${channelId}`);

      const marker = `smoke-test-${new Date().toISOString()}`;
      await client.sendMessage(channelId, marker);
      console.log(`Message sent with marker: ${marker}`);

      console.log("Reading messages back...");
      const { messages } = await client.getMessages(channelId, 50);
      const marked = messages.find((msg) => msg.content === marker);

      if (marked) {
        console.log("Reacting to the test message (kind 7)...");
        await client.react(marked.id, channelId, "+");
        console.log("Reaction accepted.");
        console.log("PASS: Marker message found in channel");
      } else {
        console.log("FAIL: Marker message not found in channel");
        process.exit(1);
      }
    }

    console.log("Setting status with text and an emoji...");
    const statusMarker = `smoke-test-status-${new Date().toISOString()}`;
    const statusEmoji = "\u{1F41D}";
    await client.setStatus(statusMarker, statusEmoji);
    console.log("Status set.");

    console.log("Reading status back...");
    const status = await client.getStatus();
    if (status && status.text === statusMarker && status.emoji === statusEmoji) {
      console.log("PASS: Status text round-tripped and the emoji came back in its own field, not embedded in the text");
    } else {
      console.log(`FAIL: Status round-trip mismatch (got ${JSON.stringify(status)})`);
      process.exit(1);
    }

    console.log("Clearing status...");
    await client.clearStatus();
    const cleared = await client.getStatus();
    if (cleared === null) {
      console.log("PASS: Status cleared");
    } else {
      console.log(`FAIL: Status was not cleared (got ${JSON.stringify(cleared)})`);
      process.exit(1);
    }

    // Optional: set BUZZ_SMOKE_DM_PUBKEY to a 64-char hex pubkey to exercise the
    // DM path. This publishes a real kind:41010 event that opens a real
    // conversation with that pubkey, which the other person will see appear, so
    // it is opt-in rather than automatic. Use somebody else's pubkey, or one
    // belonging to an agent you own: pointing it at your own pubkey makes the
    // relay answer 500, because a conversation whose only participant is
    // yourself is a case it does not handle.
    const dmPubkey = process.env.BUZZ_SMOKE_DM_PUBKEY;
    if (dmPubkey) {
      console.log(`Opening a DM with ${dmPubkey}...`);
      const channelId = await client.openDirectMessage(dmPubkey);
      if (!channelId) {
        console.log("FAIL: openDirectMessage returned an empty channel id");
        process.exit(1);
      }
      console.log(`Opened DM channel: ${channelId}`);

      const again = await client.openDirectMessage(dmPubkey);
      if (again !== channelId) {
        console.log(`FAIL: opening the same DM twice gave different ids: ${channelId} then ${again}`);
        process.exit(1);
      }
      console.log("PASS: opening the same DM twice is idempotent");

      const conversations = await client.listDirectMessages();
      if (!conversations.some((c) => c.channelId === channelId)) {
        console.log(`FAIL: listDirectMessages did not include the just-opened ${channelId}`);
        process.exit(1);
      }
      console.log(`PASS: listDirectMessages includes it, ${conversations.length} conversation(s) total`);
    } else {
      console.log("Skipping the DM check: set BUZZ_SMOKE_DM_PUBKEY to run it");
    }

    process.exit(0);
  } catch (e) {
    process.stderr.write(`Error: ${errorMessage(e)}\n`);
    process.exit(1);
  }
}

main();
