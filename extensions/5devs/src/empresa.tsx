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
        <Action.CopyToClipboard title="Copiar" content={content} />
        <Action
          title="Gerar Nova Empresa"
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
        <List.Section title="Empresa">
          <List.Item
            title={company.razaoSocial}
            subtitle="Razão Social"
            icon={Icon.Building}
            actions={actions(company.razaoSocial)}
          />
          <List.Item
            title={mask ? company.cnpj : company.cnpj.replaceAll(/\D/g, "")}
            subtitle="CNPJ"
            icon={Icon.BlankDocument}
            actions={actions(company.cnpj)}
          />
          <List.Item
            title={mask ? company.inscricaoEstadual : company.inscricaoEstadual.replaceAll(/\D/g, "")}
            subtitle={company.inscricaoEstadual}
            icon={Icon.CreditCard}
            actions={actions(company.inscricaoEstadual)}
          />
          <List.Item
            title={company.dataAbertura}
            subtitle="Data de Abertura"
            icon={Icon.Calendar}
            actions={actions(company.dataAbertura)}
          />
          <List.Item title={company.site} subtitle="Site" icon={Icon.Globe} actions={actions(company.site)} />
          <List.Item title={company.email} subtitle="Email" icon={Icon.Envelope} actions={actions(company.email)} />
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
