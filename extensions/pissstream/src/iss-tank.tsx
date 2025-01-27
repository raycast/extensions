import { useEffect, useState } from "react";
import { List } from "@raycast/api";
import { LightstreamerClient, Subscription, SubscriptionListener } from "lightstreamer-client-node";

export default function ISSTankCommand() {
  const [pissAmount, setPissAmount] = useState("N/A");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1) Create and configure the Lightstreamer client
    const client = new LightstreamerClient(
      "https://push.lightstreamer.com",
      "ISSLIVE", // adapterSet
    );
    // optional: disable slowing, etc.:
    // client.connectionOptions.setSlowingEnabled(false);

    // 2) Create the subscription
    //    - MERGE mode for single-value updates
    //    - Subscribing to "NODE3000005"
    //    - Tracking field "Value"
    const subscription = new Subscription("MERGE", ["NODE3000005"], ["Value"]);

    subscription.setRequestedSnapshot("yes");

    // 3) Attach a listener to handle item updates
    const listener: SubscriptionListener = {
      onItemUpdate(update) {
        // Grab the updated "Value" field from Lightstreamer
        const newValue = update.getValue("Value") || "N/A";
        // Append a "%" sign for display
        setPissAmount(`${newValue}%`);
        setIsLoading(false);
      },
      onSubscription() {
        // Called once subscription is fully active
        console.log("Subscription active!");
      },
      onUnsubscription() {
        console.log("Subscription removed.");
      },
      onSubscriptionError(code, message) {
        console.error(`Subscription error: [${code}] ${message}`);
      },
    };
    subscription.addListener(listener);

    // 4) Connect and subscribe
    client.connect();
    client.subscribe(subscription);

    // 5) Cleanup on unmount: unsubscribe & disconnect
    return () => {
      client.unsubscribe(subscription);
      client.disconnect();
    };
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="ISS Urine Tank Fullness (Lightstreamer)">
      <List.Section title="Real-time ISS Urine Tank">
        <List.Item title={pissAmount} subtitle="Urine Tank Fullness" icon="🧑🏽‍🚀🚽" />
      </List.Section>
    </List>
  );
}
