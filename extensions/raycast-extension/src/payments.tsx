import { useCallback, useEffect, useState } from "react";
import { ErrorView } from "./components/ErrorView";
import { PaymentsListView } from "./components/PaymentsListView";
import { runZbdw } from "./lib/runner";

export default function PaymentsCommand() {
  const [isLoading, setIsLoading] = useState(true);
  const [payments, setPayments] = useState<unknown[]>([]);
  const [error, setError] = useState<unknown>();

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      const response = await runZbdw(["payments"]);
      if (Array.isArray(response)) {
        setPayments(response);
      } else {
        setPayments([]);
      }
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPayments();
  }, [fetchPayments]);

  if (error !== undefined) {
    return <ErrorView title="zbdw payments" error={error} onBack={() => setError(undefined)} />;
  }

  return <PaymentsListView payments={payments} isLoading={isLoading} onRefresh={() => void fetchPayments()} />;
}
