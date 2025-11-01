import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { companyData } from "./generators/empresa";
import { addressData } from "./generators/endereco";
import { phoneData } from "./generators/telefone";
import { useCachedState } from "@raycast/utils";

export default function Command() {
  const [mask, setMask] = useCachedState("mask", false);
  const [isLoading, setIsLoading] = useState(true);

  const [company, setCompany] = useState({
    cnpj: "",
    razaoSocial: "",
    inscricaoEstadual: "",
    dataAbertura: "",
    site: "",
    email: "",
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
    (async () => {
      const company = companyData(true);
      setCompany(company);
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
          title="Generate New Company"
          icon={Icon.Repeat}
          onAction={async () => {
            setIsLoading(true);
            const newCompany = companyData(mask);
            setCompany(newCompany);
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
        <List.Section title="Company">
          <List.Item
            title={company.razaoSocial}
            subtitle="Name"
            icon={Icon.Building}
            actions={actions(company.razaoSocial)}
            keywords={["name", "nome", "razão social"]}
          />
          <List.Item
            title={mask ? company.cnpj : company.cnpj.replaceAll(/\D/g, "")}
            subtitle="CNPJ"
            icon={Icon.BlankDocument}
            actions={actions(company.cnpj)}
            keywords={["cnpj"]}
          />
          <List.Item
            title={mask ? company.inscricaoEstadual : company.inscricaoEstadual.replaceAll(/\D/g, "")}
            subtitle="State Registration"
            icon={Icon.CreditCard}
            actions={actions(company.inscricaoEstadual)}
            keywords={["state", "estado", "inscrição estadual"]}
          />
          <List.Item
            title={company.dataAbertura}
            subtitle="Opening Date"
            icon={Icon.Calendar}
            actions={actions(company.dataAbertura)}
            keywords={["data de abertura", "opening date"]}
          />
          <List.Item
            title={company.site}
            subtitle="Site"
            icon={Icon.Globe}
            actions={actions(company.site)}
            keywords={["site", "website"]}
          />
          <List.Item
            title={company.email}
            subtitle="Email"
            icon={Icon.Envelope}
            actions={actions(company.email)}
            keywords={["email"]}
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
