// src/transactionsMenuBar.tsx
import { MenuBarExtra, Icon, open, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { authorize } from "./oauth";
import { useMemo, useState, useEffect } from "react";

// --- Type Interfaces for Mollie API Responses ---
interface Amount {
  value: string;
  currency: string;
}

interface Payment {
  id: string;
  amount: Amount;
  description: string;
  status: string;
  createdAt: string;
}

interface PaginatedPayments {
  _embedded: {
    payments: Payment[];
  };
}

// Helper to format currency
const formatCurrency = (value: number, currency: string) => {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency }).format(value);
};

// The actual MenuBar component, now separated
function TransactionsMenuBar({ accessToken }: { accessToken: string }) {
  // We explicitly pass the accessToken in the headers to useFetch.
  const { data, isLoading } = useFetch<PaginatedPayments>(`https://api.mollie.com/v2/payments?limit=250`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    keepPreviousData: true,
    // Suppress default error toast - we handle errors gracefully
    onError: (error) => {
      console.error("Failed to fetch payments:", error);
    },
  });

  const { totalAmount, transactionCount } = useMemo(() => {
    if (!data?._embedded?.payments) {
      return { totalAmount: formatCurrency(0, "EUR"), transactionCount: 0 };
    }

    // Filter for today's paid payments
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    const todayPaidPayments = data._embedded.payments.filter((p) => {
      const paymentDate = new Date(p.createdAt);
      return p.status === "paid" && paymentDate.getTime() >= todayTimestamp;
    });

    const total = todayPaidPayments.reduce((sum, p) => sum + parseFloat(p.amount.value), 0);
    const currency = todayPaidPayments[0]?.amount.currency || "EUR";

    return {
      totalAmount: formatCurrency(total, currency),
      transactionCount: todayPaidPayments.length,
    };
  }, [data]);

  return (
    <MenuBarExtra title={`Today: ${totalAmount}`} isLoading={isLoading}>
      <MenuBarExtra.Section title="Today's revenue">
        <MenuBarExtra.Item title={`Total: ${totalAmount}`} />
        <MenuBarExtra.Item title={`Transactions: ${transactionCount}`} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Mollie"
          icon={Icon.ArrowNe}
          onAction={() => open(`https://my.mollie.com/dashboard/payments?period=today&status=paid`)}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

// Main component to handle the authorization flow explicitly
export default function Command() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function doAuthorize() {
      try {
        const token = await authorize();
        setAccessToken(token);
      } catch (err) {
        console.error("Authorization failed:", err);
        setError(err as Error);
        showToast(Toast.Style.Failure, "Authorization Failed", (err as Error).message);
      } finally {
        setIsLoading(false);
      }
    }
    doAuthorize();
  }, []);

  if (error) {
    // Show an error in the menu bar if auth fails
    return <MenuBarExtra icon={Icon.Warning} title="Auth Failed" />;
  }

  // Render the actual menu bar component only after we have a token
  return isLoading ? <MenuBarExtra isLoading={true} /> : <TransactionsMenuBar accessToken={accessToken!} />;
}
