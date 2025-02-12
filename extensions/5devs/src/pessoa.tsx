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
        <Action.CopyToClipboard title="Copy" content={content} />
        <Action
          title="Generate New Person"
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
        <List.Section title="Person">
          <List.Item
            title={person.nome}
            subtitle="Name"
            icon={Icon.Lowercase}
            actions={actions(person.nome)}
            keywords={["name", "nome"]}
          />
          <List.Item
            title={mask ? person.cpf : person.cpf.replaceAll(/\D/g, "")}
            subtitle="CPF"
            icon={Icon.CreditCard}
            actions={actions(person.cpf)}
            keywords={["cpf"]}
          />
          <List.Item
            title={mask ? person.rg : person.rg.replaceAll(/\D/g, "")}
            subtitle="RG"
            icon={Icon.Receipt}
            actions={actions(person.rg)}
            keywords={["rg"]}
          />
          <List.Item
            title={person.sexo}
            subtitle="Gender"
            icon={person.sexo === "Masculino" ? Icon.Male : Icon.Female}
            actions={actions(person.sexo)}
            keywords={["gender", "sexo"]}
          />
          <List.Item
            title={person.dataNascimento}
            subtitle="Birthday"
            icon={Icon.Calendar}
            actions={actions(person.dataNascimento)}
            keywords={["birthday", "data", "aniversário"]}
          />
          <List.Item
            title={person.email}
            subtitle="Email"
            icon={Icon.Envelope}
            actions={actions(person.email)}
            keywords={["email"]}
          />
          <List.Item
            title={person.signo}
            subtitle="Zodiac Sign"
            icon={Icon.Star}
            actions={actions(person.signo)}
            keywords={["signo", "zodiac"]}
          />
          <List.Item
            title={person.nomePai}
            subtitle="Father's Name"
            icon={Icon.Male}
            actions={actions(person.nomePai)}
            keywords={["dad", "pai", "nome"]}
          />
          <List.Item
            title={person.nomeMae}
            subtitle="Mother's Name"
            icon={Icon.Female}
            actions={actions(person.nomeMae)}
            keywords={["mom", "mãe", "mother", "name"]}
          />
        </List.Section>
        <List.Section title="Address">
          <List.Item
            title={mask ? address.cep : address.cep.replaceAll(/\D/g, "")}
            subtitle="CEP"
            actions={actions(address.cep)}
            icon={Icon.BarCode}
            keywords={["cep", "address", "endereço"]}
          />
          <List.Item
            title={address.logradouro}
            subtitle="Street"
            actions={actions(address.logradouro)}
            icon={Icon.Geopin}
            keywords={["street", "rua", "address", "endereço"]}
          />
          <List.Item
            title={address.numero}
            subtitle="Number"
            actions={actions(address.numero)}
            icon={Icon.Cd}
            keywords={["number", "numero", "address", "endereço"]}
          />
          {address.complemento && (
            <List.Item
              title={address.complemento}
              subtitle="Complement"
              actions={actions(address.complemento)}
              icon={Icon.Lowercase}
              keywords={["complemento", "complement", "address", "endereço"]}
            />
          )}
          <List.Item
            title={address.bairro}
            subtitle="Neighborhood"
            actions={actions(address.bairro)}
            icon={Icon.Map}
            keywords={["neighborhood", "bairro", "address", "endereço"]}
          />
          <List.Item
            title={address.localidade}
            subtitle="City"
            actions={actions(address.localidade)}
            icon={Icon.Compass}
            keywords={["city", "cidade", "address", "endereço"]}
          />
          <List.Item
            title={address.uf}
            subtitle="State"
            actions={actions(address.uf)}
            icon={Icon.AirplaneTakeoff}
            keywords={["estado", "state", "uf", "address", "endereço"]}
          />
        </List.Section>
        <List.Section title="Phone">
          <List.Item
            title={mask ? phone : phone.replaceAll(/\D/g, "")}
            subtitle="Phone"
            icon={Icon.Phone}
            actions={actions(phone)}
            keywords={["phone", "telefone", "celular", "number", "número"]}
          />
        </List.Section>
      </List>
    </>
  );
}
