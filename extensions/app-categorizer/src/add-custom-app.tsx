import {
  Action,
  ActionPanel,
  Form,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { addCustomApp } from "./utils/storage";

interface FormValues {
  name: string;
  execPath: string[];
  launchUri: string;
  iconPath: string[];
}

/** Extrai o App ID de uma URI no formato steam://rungameid/12345 */
function extractSteamAppId(uri: string): string | undefined {
  const match = uri.match(/^steam:\/\/rungameid\/(\d+)/i);
  return match ? match[1] : undefined;
}

export default function AddCustomApp() {
  const [nameError, setNameError] = useState<string | undefined>();
  const [targetError, setTargetError] = useState<string | undefined>();

  async function handleSubmit(values: FormValues) {
    const name = values.name.trim();
    const uri = values.launchUri.trim();
    const filePath = values.execPath?.[0];
    const manualIcon = values.iconPath?.[0];

    if (!name) {
      setNameError("Informe um nome para o app");
      return;
    }
    if (!uri && !filePath) {
      setTargetError("Escolha um executável OU preencha um link de launcher");
      return;
    }

    const target = uri || filePath;

    // Se for um jogo da Steam e o usuário não escolheu um ícone manual,
    // busca automaticamente a capa do jogo direto do CDN da Steam.
    let icon = manualIcon;
    if (!icon) {
      const steamAppId = extractSteamAppId(uri);
      if (steamAppId) {
        icon = `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamAppId}/header.jpg`;
      }
    }

    await addCustomApp({ name, path: target as string, isCustom: true, icon });
    showToast({
      style: Toast.Style.Success,
      title: `"${name}" adicionado`,
      message: "Agora ele aparece na lista ao criar/editar categorias",
    });
    popToRoot();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Adicionar App" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Use isso para jogos (Steam/Epic/etc.) ou qualquer app que não apareça na lista automática." />
      <Form.TextField
        id="name"
        title="Nome"
        placeholder="Ex: Counter-Strike 2"
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.Separator />
      <Form.FilePicker
        id="execPath"
        title="Executável (.exe)"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        info="Use isso para apps comuns instalados fora do menu Iniciar."
        error={targetError}
        onChange={() => setTargetError(undefined)}
      />
      <Form.TextField
        id="launchUri"
        title="OU link de launcher"
        placeholder="Ex: steam://rungameid/730"
        info={
          "Para jogos de Steam/Epic/Battle.net, prefira isso em vez do .exe direto — " +
          "executar o .exe puro costuma fechar sozinho porque o jogo espera ser aberto pelo launcher.\n" +
          "Steam: steam://rungameid/SEU_APP_ID (o App ID aparece na URL da loja Steam do jogo).\n" +
          "Epic Games: com.epicgames.launcher://apps/SEU_APP_NAME?action=launch\n" +
          "Para jogos de Steam, a capa do jogo é buscada automaticamente como ícone (a não ser que você escolha um manualmente abaixo)."
        }
        error={targetError}
        onChange={() => setTargetError(undefined)}
      />
      <Form.Separator />
      <Form.FilePicker
        id="iconPath"
        title="Ícone personalizado (opcional)"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        info="Escolha uma imagem (.png, .jpg) para usar como ícone. Se não escolher e for um jogo Steam, a capa é buscada automaticamente."
      />
    </Form>
  );
}
