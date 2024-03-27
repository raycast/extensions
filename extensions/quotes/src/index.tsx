import React, { useEffect, useState } from "react";
import yahooFinance from "yahoo-finance2";
import { Quote } from "yahoo-finance2/dist/esm/src/modules/quote";

import { ActionPanel, Form, Action, Detail, useNavigation } from "@raycast/api";

export default function Command() {
  const { push } = useNavigation();
  const [symbol, setSymbol] = useState("NVDA");

  return (
    <>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Get Quote" onSubmit={() => push(<QuoteView symbol={symbol} />)} />
          </ActionPanel>
        }
      >
        <Form.TextField id="symbol" value={symbol} onChange={setSymbol} />
      </Form>
    </>
  );
}

type QuoteViewProps = {
  symbol: string;
};

const QuoteView: React.FC<QuoteViewProps> = ({ symbol }) => {
  const [quote, setQuote] = useState<Quote | null>(null);
  useEffect(() => {
    async function fetchQuote() {
      const q = await yahooFinance.quote(symbol);
      if (q.symbol != quote?.symbol) {
        console.log(q);
        setQuote(q);
      }
    }
    fetchQuote();
  }, [quote]);

  return (
    <>
      {quote ? (
        <Detail markdown={`# ${symbol.toUpperCase()} ${quote.regularMarketPrice}`} />
      ) : (
        <Detail markdown="Fetching quote..." />
      )}
    </>
  );
};
