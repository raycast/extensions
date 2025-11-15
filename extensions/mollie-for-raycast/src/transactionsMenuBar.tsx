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

interface Settlement {
  amount: Amount;
  settlementDate: string;
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
  });

  // Fetch next settlement data
  const { data: settlementData, isLoading: isLoadingSettlement } = useFetch<Settlement>(
    `https://api.mollie.com/v2/settlements/next`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      keepPreviousData: true,
    },
  );

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

  const hasSettlementData = settlementData?.amount && settlementData?.settlementDate;
  const settlementAmount = hasSettlementData
    ? formatCurrency(parseFloat(settlementData.amount.value), settlementData.amount.currency)
    : null;
  const settlementDate = hasSettlementData ? new Date(settlementData.settlementDate).toLocaleDateString("nl-NL") : null;

  return (
    <MenuBarExtra title={`Today: ${totalAmount}`} isLoading={isLoading || isLoadingSettlement}>
      <MenuBarExtra.Section title="Today's revenue">
        <MenuBarExtra.Item title={`Total: ${totalAmount}`} />
        <MenuBarExtra.Item title={`Transactions: ${transactionCount}`} />
      </MenuBarExtra.Section>
      {hasSettlementData ? (
        <MenuBarExtra.Section title="Estimated next payout">
          <MenuBarExtra.Item title={`${settlementAmount}`} />
          <MenuBarExtra.Item title={`${settlementDate}`} />
        </MenuBarExtra.Section>
      ) : (
        !isLoadingSettlement && (
          <MenuBarExtra.Section title="Next payout">
            <MenuBarExtra.Item title="No upcoming settlement" />
          </MenuBarExtra.Section>
        )
      )}
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
