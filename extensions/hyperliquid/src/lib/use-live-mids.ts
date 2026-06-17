import "./polyfill-ws";

import { EventClient, WebSocketTransport } from "@nktkas/hyperliquid";
import type { AllMids, Subscription } from "@nktkas/hyperliquid";
import { useEffect, useState } from "react";

export function useLiveMids(enabled = true): AllMids {
  const [mids, setMids] = useState<AllMids>({});

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const transport = new WebSocketTransport();
    const client = new EventClient({ transport });
    let disposed = false;
    let subscription: Subscription | undefined;

    // Always resolves (failures are swallowed) so teardown can safely await it.
    const subscribed = client
      .allMids((data) => {
        if (!disposed) {
          setMids(data.mids);
        }
      })
      .then((activeSubscription) => {
        subscription = activeSubscription;
      })
      .catch(() => {
        // Connection or subscription failed; live prices just won't update.
      });

    return () => {
      disposed = true;
      // Wait for the subscribe attempt to settle before closing. Closing while
      // the handshake is still in flight makes `ws` reject with "closed before
      // the connection was established"; awaiting avoids that race, and we
      // swallow any teardown rejection since the view is going away regardless.
      void subscribed
        .then(() => subscription?.unsubscribe())
        .catch(() => {})
        .finally(() => {
          void transport.close().catch(() => {});
        });
    };
  }, [enabled]);

  return mids;
}
