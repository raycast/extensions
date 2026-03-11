import { Action, ActionPanel, List } from "@raycast/api";
import { GenerateCnpj, GenerateCnpjFormatted } from "../actions/documents/generate-cnpj.action";
import { GenerateCpf, GenerateCpfFormatted } from "../actions/documents/generate-cpf.action";

const generateCpf = new GenerateCpf();
const generateCpfFormatted = new GenerateCpfFormatted();
const generateCnpj = new GenerateCnpj();
const generateCnpjFormatted = new GenerateCnpjFormatted();

export function Documents() {
  return (
    <List navigationTitle="Generate documents">
      <List.Item
        title="CPF"
        subtitle="12345678909"
        actions={
          <ActionPanel>
            <Action title={generateCpf.name} onAction={generateCpf.action} />
          </ActionPanel>
        }
      />
      <List.Item
        title="CPF (formatted)"
        subtitle="123.456.789-09"
        actions={
          <ActionPanel>
            <Action title={generateCpfFormatted.name} onAction={generateCpfFormatted.action} />
          </ActionPanel>
        }
      />
      <List.Item
        title="CNPJ"
        subtitle="12345678901234"
        actions={
          <ActionPanel>
            <Action title={generateCnpj.name} onAction={generateCnpj.action} />
          </ActionPanel>
        }
      />
      <List.Item
        title="CNPJ (formatted)"
        subtitle="12.345.678/9012-34"
        actions={
          <ActionPanel>
            <Action title={generateCnpjFormatted.name} onAction={generateCnpjFormatted.action} />
          </ActionPanel>
        }
      />
    </List>
  );
}
