import "./polyfill-ws";

import { SubscriptionClient, WebSocketTransport } from "@nktkas/hyperliquid";
import type { AllMidsResponse, ISubscription } from "@nktkas/hyperliquid";
import { useEffect, useState } from "react";

export function useLiveMids(enabled = true): AllMidsResponse {
  const [mids, setMids] = useState<AllMidsResponse>({});

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const transport = new WebSocketTransport();
    const client = new SubscriptionClient({ transport });
    let disposed = false;
    let subscription: ISubscription | undefined;

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
          transport.close();
        });
    };
  }, [enabled]);

  return mids;
}
