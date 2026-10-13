import { Action, Icon, LaunchType, launchCommand, showToast, Toast } from "@raycast/api";
import { ATALHOS } from "../nucleo/atalhos";

async function abrir(nome: string, rotuloDoComando: string, contexto?: Record<string, unknown>) {
  try {
    await launchCommand({ name: nome, type: LaunchType.UserInitiated, context: contexto });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: `Ative o comando ${rotuloDoComando} nas preferências da extensão`,
    });
  }
}

export function AbrirPratica({ palavra }: { palavra?: string }) {
  return (
    <Action
      title={palavra ? "Praticar esta palavra" : "Praticar agora"}
      icon={Icon.Keyboard}
      onAction={() => abrir("praticar", "Praticar Digitação", palavra ? { palavra } : undefined)}
    />
  );
}

export function AbrirVocabulario() {
  return (
    <Action
      title="Abrir o vocabulário"
      icon={Icon.Book}
      shortcut={ATALHOS.vocabulario}
      onAction={() => abrir("vocabulario", "Vocabulário")}
    />
  );
}

export function AbrirProgresso() {
  return (
    <Action
      title="Ver meu progresso"
      icon={Icon.BarChart}
      shortcut={ATALHOS.progresso}
      onAction={() => abrir("progresso", "Meu Progresso")}
    />
  );
}
