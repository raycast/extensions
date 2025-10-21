import { Action, ActionPanel, Form, List, showHUD, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { getPeers, sendPoke, isHealthy, NearbyPeer } from "./api";

// Single command flow:
// 1) Show list of peers
// 2) On select, show a small form to input optional note
// 3) Send poke and show HUD

export default function Command() {
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [peers, setPeers] = useState<NearbyPeer[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<NearbyPeer | null>(null);

  useEffect(() => {
    // First, check health
    (async () => {
      setLoading(true);
      const ok = await isHealthy();
      setHealthy(ok);
      if (!ok) {
        setLoading(false);
        return;
      }
      try {
        const r = await getPeers();
        setPeers(r.nearby);
      } catch (e) {
        setErr(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (err)
    return (
      <List searchBarPlaceholder="Error" filtering={false}>
        <List.EmptyView title={err} />
      </List>
    );

  if (healthy === false) {
    return (
      <List searchBarPlaceholder="Server unavailable" filtering={false} isLoading={loading}>
        <List.EmptyView
          title="Poke not reachable"
          description="Make sure the Poke app is running."
          actions={
            <ActionPanel>
              <Action
                title="Retry Health Check"
                onAction={async () => {
                  setHealthy(null);
                  setLoading(true);
                  const ok = await isHealthy();
                  setHealthy(ok);
                  if (ok) {
                    try {
                      const r = await getPeers();
                      setPeers(r.nearby);
                      setErr(null);
                    } catch (e) {
                      setErr(String(e));
                    }
                  }
                  setLoading(false);
                }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (!selected) {
    return (
      <List isLoading={loading} searchBarPlaceholder="Select a peer to poke">
        {peers.map((p) => (
          <List.Item
            key={p.id}
            title={p.displayName}
            subtitle="Online"
            actions={
              <ActionPanel>
                <Action title="Poke" onAction={() => setSelected(p)} />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }

  return <PokeForm peer={selected} onDone={() => setSelected(null)} />;
}

function PokeForm({ peer, onDone }: { peer: NearbyPeer; onDone: () => void }) {
  const nav = useNavigation();
  async function onSubmit(values: { note?: string }) {
    try {
      const res = await sendPoke(peer.id, values.note);
      await showHUD(res.delivered ? `Poked ${peer.displayName}` : `Poke to ${peer.displayName} failed`);
      nav.pop();
      onDone();
    } catch (error) {
      await showHUD(`Failed to send poke: ${error}`);
    }
  }
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={`Send to ${peer.displayName}`} onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Peer" text={peer.displayName} />
      <Form.TextArea id="note" title="Note" placeholder="Optional note" enableMarkdown={false} autoFocus />
    </Form>
  );
}
