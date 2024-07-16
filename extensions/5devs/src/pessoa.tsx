import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { addressData } from "./generators/endereco";
import { phoneData } from "./generators/telefone";
import { personData } from "./generators/pessoa";
import { useCachedState } from "@raycast/utils";

export default function Command() {
  const [mask, setMask] = useCachedState("mask", false);
  const [isLoading, setIsLoading] = useState(true);

  const [person, setPerson] = useState({
    nome: "",
    dataNascimento: "",
    sexo: "",
    email: "",
    signo: "",
    nomePai: "",
    nomeMae: "",
    cpf: "",
    rg: "",
  });

  const [address, setAddress] = useState({
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    localidade: "",
    uf: "",
  });

  const [phone, setPhone] = useState("");

  useEffect(() => {
    setIsLoading(true);
    (async () => {
      const person = personData(true);
      setPerson(person);
      const address = await addressData();
      setAddress(address);
      const phone = phoneData(true);
      setPhone(phone);
    })();
    setIsLoading(false);
  }, []);

  const actions = (content: string) => {
    return (
      <ActionPanel>
        <Action.CopyToClipboard title="Copiar" content={content} />
        <Action
          title="Gerar Nova Pessoa"
          icon={Icon.Repeat}
          onAction={async () => {
            const newPerson = personData(mask);
            setPerson(newPerson);
            const newAddress = await addressData();
            setAddress(newAddress);
            const newPhone = phoneData(mask);
            setPhone(newPhone);
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
        <List.Section title="Pessoa">
          <List.Item title={person.nome} subtitle="Nome" icon={Icon.Lowercase} actions={actions(person.nome)} />
          <List.Item
            title={mask ? person.cpf : person.cpf.replaceAll(/\D/g, "")}
            subtitle="CPF"
            icon={Icon.CreditCard}
            actions={actions(person.cpf)}
          />
          <List.Item
            title={mask ? person.rg : person.rg.replaceAll(/\D/g, "")}
            subtitle="RG"
            icon={Icon.Receipt}
            actions={actions(person.rg)}
          />
          <List.Item
            title={person.sexo}
            subtitle="Sexo"
            icon={person.sexo === "Masculino" ? Icon.Male : Icon.Female}
            actions={actions(person.sexo)}
          />
          <List.Item
            title={person.dataNascimento}
            subtitle="Data de Nascimento"
            icon={Icon.Calendar}
            actions={actions(person.dataNascimento)}
          />
          <List.Item title={person.email} subtitle="Email" icon={Icon.Envelope} actions={actions(person.email)} />
          <List.Item title={person.signo} subtitle="Signo" icon={Icon.Star} actions={actions(person.signo)} />
          <List.Item title={person.nomePai} subtitle="Nome Pai" icon={Icon.Male} actions={actions(person.nomePai)} />
          <List.Item title={person.nomeMae} subtitle="Nome Mãe" icon={Icon.Female} actions={actions(person.nomeMae)} />
        </List.Section>
        <List.Section title="Endereço">
          <List.Item
            title={mask ? address.cep : address.cep.replaceAll(/\D/g, "")}
            subtitle="CEP"
            actions={actions(address.cep)}
            icon={Icon.BarCode}
          />
          <List.Item
            title={address.logradouro}
            subtitle="Rua"
            actions={actions(address.logradouro)}
            icon={Icon.Geopin}
          />
          <List.Item title={address.numero} subtitle="Número" actions={actions(address.numero)} icon={Icon.Cd} />
          {address.complemento && (
            <List.Item
              title={address.complemento}
              subtitle="Complemento"
              actions={actions(address.complemento)}
              icon={Icon.Lowercase}
            />
          )}
          <List.Item title={address.bairro} subtitle="Bairro" actions={actions(address.bairro)} icon={Icon.Map} />
          <List.Item
            title={address.localidade}
            subtitle="Cidade"
            actions={actions(address.localidade)}
            icon={Icon.Compass}
          />
          <List.Item title={address.uf} subtitle="Estado" actions={actions(address.uf)} icon={Icon.AirplaneTakeoff} />
        </List.Section>
        <List.Section title="Telefone">
          <List.Item
            title={mask ? phone : phone.replaceAll(/\D/g, "")}
            subtitle="Telefone"
            icon={Icon.Phone}
            actions={actions(phone)}
          />
        </List.Section>
      </List>
    </>
  );
}
