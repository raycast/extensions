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
        <Action.CopyToClipboard title="Copiar" content={content} />
        <Action
          title="Gerar Nova Cartão"
          icon={Icon.Repeat}
          onAction={async () => {
            const newCard = cartao();
            setCard(newCard);
            setIsLoading(false);
          }}
        />
        <Action
          title="Mudar Máscara"
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
        <List.Section title="Cartão">
          <List.Item
            title={mask ? card.numero : card.numero.replaceAll(/\D/g, "")}
            subtitle="Número"
            icon={Icon.CreditCard}
            actions={actions(card.numero)}
          />
          <List.Item title={card.cvv} subtitle="CVV" icon={Icon.Hashtag} actions={actions(card.cvv)} />
          <List.Item title={card.bandeira} subtitle="Bandeira" icon={Icon.Flag} actions={actions(card.bandeira)} />
          <List.Item
            title={card.expiracao}
            subtitle="Expiração"
            icon={Icon.Calendar}
            actions={actions(card.expiracao)}
          />
          <List.Item title={card.titular} subtitle="Titular" icon={Icon.Person} actions={actions(card.titular)} />
        </List.Section>
      </List>
    </>
  );
}
