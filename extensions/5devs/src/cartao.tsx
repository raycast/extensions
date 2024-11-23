import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { cartao } from "./generators/cartao";
import { useCachedState } from "@raycast/utils";

export default function Command() {
  const [mask, setMask] = useCachedState("mask", false);
  const [isLoading, setIsLoading] = useState(true);

  const [card, setCard] = useState({
    numero: "",
    titular: "",
    expiracao: "",
    bandeira: "",
    cvv: "",
  });

  useEffect(() => {
    (async () => {
      const newCard = cartao();
      setCard(newCard);
    })();
    setIsLoading(false);
  }, []);

  const actions = (content: string) => {
    return (
      <ActionPanel>
        <Action.CopyToClipboard title="Copy" content={content} />
        <Action
          title="Generate New Card"
          icon={Icon.Repeat}
          onAction={async () => {
            const newCard = cartao();
            setCard(newCard);
            setIsLoading(false);
          }}
        />
        <Action
          title="Toggle Mask"
          icon={Icon.Mask}
          onAction={() => {
            setMask(!mask);
          }}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
        />
      </ActionPanel>
    );
  };

  return (
    <>
      <List isLoading={isLoading}>
        <List.Section title="Card">
          <List.Item
            title={mask ? card.numero : card.numero.replaceAll(/\D/g, "")}
            subtitle="Number"
            icon={Icon.CreditCard}
            actions={actions(card.numero)}
            keywords={["numero", "number"]}
          />
          <List.Item
            title={card.cvv}
            subtitle="CVV"
            icon={Icon.Hashtag}
            actions={actions(card.cvv)}
            keywords={["cvv"]}
          />
          <List.Item
            title={card.bandeira}
            subtitle="Brand"
            icon={Icon.Flag}
            actions={actions(card.bandeira)}
            keywords={["bandeira", "brand"]}
          />
          <List.Item
            title={card.expiracao}
            subtitle="Expiration"
            icon={Icon.Calendar}
            actions={actions(card.expiracao)}
            keywords={["validade", "validity", "expiration"]}
          />
          <List.Item
            title={card.titular}
            subtitle="Holder"
            icon={Icon.Person}
            actions={actions(card.titular)}
            keywords={["holder", "name", "nome do portador"]}
          />
        </List.Section>
      </List>
    </>
  );
}
