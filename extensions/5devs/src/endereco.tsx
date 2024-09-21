import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { addressData } from "./generators/endereco";
import { useCachedState } from "@raycast/utils";

export default function Command() {
  const [mask, setMask] = useCachedState("mask", false);
  const [isLoading, setIsLoading] = useState(true);

  const [address, setAddress] = useState({
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    localidade: "",
    uf: "",
  });

  useEffect(() => {
    (async () => {
      const address = await addressData();
      setAddress(address);
    })();
    setIsLoading(false);
  }, []);

  const actions = (content: string) => {
    return (
      <ActionPanel>
        <Action.CopyToClipboard title="Copy" content={content} />
        <Action
          title="Generate New Address"
          icon={Icon.Repeat}
          onAction={async () => {
            setIsLoading(true);
            const newAddress = await addressData();
            setAddress(newAddress);
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
        <List.Section title="Address">
          <List.Item
            title={mask ? address.cep : address.cep.replaceAll(/\D/g, "")}
            subtitle="CEP"
            actions={actions(address.cep)}
            icon={Icon.BarCode}
          />
          <List.Item
            title={address.logradouro}
            subtitle="Street"
            actions={actions(address.logradouro)}
            icon={Icon.Geopin}
          />
          <List.Item title={address.numero} subtitle="Number" actions={actions(address.numero)} icon={Icon.Cd} />
          {address.complemento && (
            <List.Item
              title={address.complemento}
              subtitle="Complement"
              actions={actions(address.complemento)}
              icon={Icon.Lowercase}
            />
          )}
          <List.Item title={address.bairro} subtitle="Neighborhood" actions={actions(address.bairro)} icon={Icon.Map} />
          <List.Item
            title={address.localidade}
            subtitle="City"
            actions={actions(address.localidade)}
            icon={Icon.Compass}
          />
          <List.Item title={address.uf} subtitle="State" actions={actions(address.uf)} icon={Icon.AirplaneTakeoff} />
        </List.Section>
      </List>
    </>
  );
}
