import {
  List,
  ActionPanel,
  Action,
  showHUD,
  Clipboard,
  Color,
  Icon,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";

const API_URL = "https://mindicador.cl/api";

interface Indicator {
  valor: number;
  fecha: string;
}

interface MindicadorResponse {
  dolar: Indicator;
  uf: Indicator;
  euro: Indicator;
  utm: Indicator;
}

function formatCLP(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function Command() {
  const { data, isLoading, error, revalidate } =
    useFetch<MindicadorResponse>(API_URL);

  const indicators = data
    ? [
        {
          id: "dolar",
          title: "Dólar",
          value: data.dolar.valor,
          date: data.dolar.fecha,
          color: Color.Green,
        },
        {
          id: "uf",
          title: "UF",
          value: data.uf.valor,
          date: data.uf.fecha,
          color: Color.Blue,
        },
        {
          id: "euro",
          title: "Euro",
          value: data.euro.valor,
          date: data.euro.fecha,
          color: Color.Purple,
        },
        {
          id: "utm",
          title: "UTM",
          value: data.utm.valor,
          date: data.utm.fecha,
          color: Color.Orange,
        },
      ]
    : [];

  return (
    <List isLoading={isLoading}>
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Could not load indicators"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ) : (
        indicators.map((item) => (
          <List.Item
            key={item.id}
            icon={{ source: Icon.BankNote, tintColor: item.color }}
            title={item.title}
            subtitle={`Updated: ${formatDate(item.date)}`}
            accessories={[{ text: `$${formatCLP(item.value)}` }]}
            actions={
              <ActionPanel>
                <Action
                  title="Copy Value"
                  icon={Icon.Clipboard}
                  onAction={async () => {
                    await Clipboard.copy(String(item.value));
                    await showHUD(
                      `${item.title} copied: $${formatCLP(item.value)}`,
                    );
                  }}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
